import { useState, useEffect } from 'react'
import { useApiCall } from '@/lib/api-client-legacy'
import { formatDateForInput } from '@/lib/utils/dateFormatters'
import { supabase } from '@/lib/supabase'

interface UseCaseNextSteps {
  evaluation?: string
  introduction?: string
  impact?: string
  conclusion?: string
}

type WorkflowStep = 'confirm-date' | 'edit-date' | 'upload-proof'

interface UseUnacceptableCaseWorkflowProps {
  useCase: {
    id: string
    name: string
    risk_level?: string
    score_final?: number | null
    deployment_date?: string | null
  } | null
  isOpen?: boolean
  onUpdateDeploymentDate?: (date: string) => Promise<void>
  initialProofUploaded?: boolean
}

export function useUnacceptableCaseWorkflow({
  useCase,
  isOpen = true,
  onUpdateDeploymentDate,
  initialProofUploaded = false
}: UseUnacceptableCaseWorkflowProps) {
  const api = useApiCall()
  const [step, setStep] = useState<WorkflowStep>('confirm-date')
  const [newDate, setNewDate] = useState('')
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null)
  const [loadingNextSteps, setLoadingNextSteps] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [proofUploaded, setProofUploaded] = useState(initialProofUploaded)

  // Charger les next steps quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && useCase && !nextSteps && !loadingNextSteps) {
      console.log('Loading nextsteps for useCase:', useCase.id)
      setLoadingNextSteps(true)
      api.get(`/api/usecases/${useCase.id}/nextsteps`)
        .then(result => {
          console.log('NextSteps loaded:', result.data)
          if (result.data) {
            setNextSteps(result.data)
          }
        })
        .catch(error => {
          console.error('Error loading next steps:', error)
        })
        .finally(() => {
          setLoadingNextSteps(false)
        })
    }
  }, [isOpen, useCase, api, nextSteps, loadingNextSteps])

  // Synchroniser proofUploaded avec initialProofUploaded (gère upload ET suppression)
  useEffect(() => {
    setProofUploaded(initialProofUploaded)
  }, [initialProofUploaded])

  const handleModifyDate = () => {
    if (!useCase) return
    setNewDate(formatDateForInput(useCase.deployment_date))
    setStep('edit-date')
  }

  const handleCancelEdit = () => {
    setNewDate('')
    setStep('confirm-date')
  }

  const handleSaveDate = async () => {
    if (!newDate || !onUpdateDeploymentDate) return

    try {
      setUpdatingDate(true)
      await onUpdateDeploymentDate(newDate)
      setNewDate('')
      setStep('confirm-date')
    } catch (error) {
      console.error('Error updating deployment date:', error)
    } finally {
      setUpdatingDate(false)
    }
  }

  const handleConfirmDate = () => {
    if (!useCase?.deployment_date) {
      console.log('Pas de date de déploiement définie')
      return
    }

    const deploymentDate = new Date(useCase.deployment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log('Deployment date:', deploymentDate)
    console.log('Today:', today)
    console.log('Is in past?', deploymentDate < today)

    if (deploymentDate < today) {
      console.log('Date dans le passé, passage à upload-proof')
      setStep('upload-proof')
    } else {
      console.log('Date dans le futur, passage à la question suivante')
      // TODO: Implémenter la suite du workflow
    }
  }

  const handleFileSelected = (file: File) => {
    setSelectedFile(file)
    setUploadError(null)
  }

  const handleUploadProof = async (usecaseId: string, onSuccess?: () => void) => {
    if (!selectedFile || !useCase) return

    try {
      setUpdatingDate(true)
      setUploadError(null)

      // Get token directly from supabase (same pattern as DossierDetailPage)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUploadError('Session expirée')
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`/api/dossiers/${usecaseId}/stopping_proof/upload`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })

      if (res.ok) {
        setProofUploaded(true)
        onSuccess?.()
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        setUploadError(errorData.error || 'Erreur lors de l\'upload')
      }
    } catch (error: any) {
      console.error('Error uploading proof:', error)
      setUploadError(error?.message || 'Erreur lors de l\'upload du document')
    } finally {
      setUpdatingDate(false)
    }
  }

  const reset = () => {
    setStep('confirm-date')
    setNewDate('')
    setSelectedFile(null)
    setUploadError(null)
    setNextSteps(null)
  }

  return {
    step,
    newDate,
    nextSteps,
    loadingNextSteps,
    selectedFile,
    uploadError,
    updatingDate,
    proofUploaded,
    setNewDate,
    setStep,
    handleModifyDate,
    handleCancelEdit,
    handleSaveDate,
    handleConfirmDate,
    handleFileSelected,
    handleUploadProof,
    reset
  }
}
