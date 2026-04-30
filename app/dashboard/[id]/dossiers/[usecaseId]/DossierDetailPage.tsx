'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { useApiCall } from '@/lib/api-client-legacy'
import { ArrowLeft, FileText, Check, Loader2, Info, ChevronDown, X, AlertTriangle, RotateCcw, Pencil, Edit } from 'lucide-react'
import ComplianceFileUpload from '@/components/ComplianceFileUpload'
import UploadedFileDisplay from '@/components/UploadedFileDisplay'
import ScoreEvolutionPopup from '@/components/ScoreEvolutionPopup'
import DateEditStep from '@/components/UnacceptableCase/DateEditStep'
import ContactHelpCard from '@/components/UnacceptableCase/ContactHelpCard'
import MarkdownText from '@/components/Shared/MarkdownText'
import RegistreMaydaiBadge from '@/app/dashboard/[id]/components/RegistreMaydaiBadge'
import { formatDate, formatDateForInput } from '@/lib/utils/dateFormatters'
import {
  getDeploymentUrgency,
  getUnacceptablePriorityHint
} from '@/lib/unacceptable-case-copy'
import {
  resolveDossierSectionIdFromUrlParam,
  normalizeHumanOversightFormData,
  getStandardDossierSectionsOrdered,
  getStoppingProofDossierSectionUi,
  getSystemPromptDossierSectionUiUnacceptable,
  type DossierSectionUiDefinition,
} from '@/lib/canonical-actions'
import {
  getUnacceptableActionDocTypesOrdered,
  getUnacceptablePrimaryDocumentType
} from '@/app/dashboard/[id]/todo-list/utils/todo-helpers'
import {
  getClassificationRiskDisplayLabel,
  getClassificationRiskPillClasses,
} from '@/lib/classification-risk-display'
import { DECLARATION_PROOF_FLOW_COPY } from '@/app/usecases/[id]/utils/declaration-proof-flow-copy'
import { normalizeQuestionnaireVersion, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { withEvaluationEntree } from '@/app/usecases/[id]/utils/routes'

/** Sections dossier flux standard — ordre, libellés, modes preuve et formats = `getStandardDossierSectionsOrdered()` (catalogue). */
const STANDARD_DOSSIER_SECTIONS: DossierSectionUiDefinition[] = getStandardDossierSectionsOrdered()

interface DocumentData {
  formData: Record<string, any> | null
  fileUrl: string | null
  status: 'incomplete' | 'complete' | 'validated'
  updatedAt: string | null
}

interface UseCase {
  id: string
  name: string
  risk_level?: string | null
  classification_status?: string | null
  score_final?: number | null
  deployment_date?: string | null
  questionnaire_version?: string | number | null
  status?: string | null
}

interface UseCaseNextStepsPayload {
  evaluation?: string
  introduction?: string
  impact?: string
  conclusion?: string
}

export default function DossierDetailPage() {
  const { user, loading: authLoading, getAccessToken } = useAuth()
  const { plan } = useUserPlan()
  const api = useApiCall()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const companyId = params.id as string
  const usecaseId = params.usecaseId as string

  const [usecaseName, setUsecaseName] = useState<string>('')
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<{
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  } | undefined>(undefined)
  const [documents, setDocuments] = useState<Record<string, DocumentData>>({})
  const [textContents, setTextContents] = useState<Record<string, string>>({})
  const [supervisorData, setSupervisorData] = useState({
    name: '',
    role: '',
    email: ''
  })
  const [initialSupervisorData, setInitialSupervisorData] = useState({
    name: '',
    role: '',
    email: ''
  })
  const [initialTextContents, setInitialTextContents] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [resetting, setResetting] = useState<Record<string, boolean>>({})
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [scoreChangePopup, setScoreChangePopup] = useState<{
    previousScore: number | null
    newScore: number | null
    pointsGained: number
    reason: string
  } | null>(null)

  const [editingDeploymentDate, setEditingDeploymentDate] = useState(false)
  const [deploymentDateDraft, setDeploymentDateDraft] = useState('')
  const [savingDeploymentDate, setSavingDeploymentDate] = useState(false)
  const [nextSteps, setNextSteps] = useState<UseCaseNextStepsPayload | null>(null)
  const [loadingNextSteps, setLoadingNextSteps] = useState(false)

  const isUnacceptableCase = useCase?.risk_level?.toLowerCase() === 'unacceptable'

  const updateDeploymentDate = async (date: string) => {
    if (!useCase) return
    const result = await api.put(`/api/usecases/${useCase.id}`, {
      deployment_date: date
    })
    if (result.data) {
      setUseCase({ ...useCase, deployment_date: date })
    }
  }

  const handleSaveDeploymentDate = async () => {
    if (!deploymentDateDraft.trim()) return
    try {
      setSavingDeploymentDate(true)
      await updateDeploymentDate(deploymentDateDraft)
      setEditingDeploymentDate(false)
    } catch (e) {
      console.error('Error saving deployment date:', e)
    } finally {
      setSavingDeploymentDate(false)
    }
  }

  const reloadDocument = async (docKey: string) => {
    if (!user) return
    const token = getAccessToken()
    if (!token) return

    try {
      const res = await fetch(`/api/dossiers/${usecaseId}/${docKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(prev => ({ ...prev, [docKey]: data }))

        // Extraire le contenu textuel si c'est system_prompt avec formData
        if (docKey === 'system_prompt' && data.formData?.system_instructions) {
          setTextContents(prev => ({ ...prev, [docKey]: data.formData.system_instructions }))
          setInitialTextContents(prev => ({ ...prev, [docKey]: data.formData.system_instructions }))
        }
      }
    } catch (error) {
      console.error('Error reloading document:', error)
    }
  }

  useEffect(() => {
    if (!isUnacceptableCase || !useCase || !user) return

    const loadNextSteps = async () => {
      const token = getAccessToken()
      if (!token) return
      try {
        setLoadingNextSteps(true)
        const res = await fetch(`/api/usecases/${usecaseId}/nextsteps`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setNextSteps(data || null)
        }
      } catch (e) {
        console.error('Error loading next steps:', e)
      } finally {
        setLoadingNextSteps(false)
      }
    }

    loadNextSteps()
  }, [isUnacceptableCase, useCase?.id, usecaseId, user, getAccessToken])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const token = getAccessToken()
        if (!token) {
          console.error('No access token available')
          return
        }

        // Fetch usecase info
        const usecaseRes = await fetch(`/api/usecases/${usecaseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        let usecaseData: any = null
        if (usecaseRes.ok) {
          usecaseData = await usecaseRes.json()
          setUsecaseName(usecaseData.name || 'Cas d\'usage')
          setUseCase(usecaseData)
        }

        // Fetch company info for registry status
        const companyRes = await fetch(`/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (companyRes.ok) {
          const companyData = await companyRes.json()
          setCompany(companyData)
        }

        // Fetch user profile for contact form pre-filling
        const profileRes = await fetch(`/api/profiles/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setUserProfile({
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            email: user?.email,
            phone: profileData.phone
          })
        }

        // Fetch all documents (including stopping_proof for unacceptable cases)
        const docsData: Record<string, DocumentData> = {}
        const textData: Record<string, string> = {}

        // List of doc types to fetch
        const docTypesToFetch = [...STANDARD_DOSSIER_SECTIONS]
        if (usecaseData?.risk_level?.toLowerCase() === 'unacceptable') {
          docTypesToFetch.push(getStoppingProofDossierSectionUi())
        }

        console.log('[FETCH] Documents to fetch:', docTypesToFetch.map(d => d.key))
        console.log('[FETCH] Usecase ID:', usecaseId)

        await Promise.all(
          docTypesToFetch.map(async (docType) => {
            console.log('[FETCH] Fetching document:', docType.key)
            const res = await fetch(`/api/dossiers/${usecaseId}/${docType.key}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
              const data = await res.json()
              console.log('[FETCH] Document loaded:', docType.key, data)
              docsData[docType.key] = data

              // Extract text content from formData
              if (data.formData) {
                if (docType.key === 'system_prompt') {
                  textData[docType.key] = data.formData.system_instructions || ''
                } else if (docType.key === 'transparency_marking') {
                  textData[docType.key] = data.formData.marking_description || ''
                } else if (docType.key === 'training_plan') {
                  textData[docType.key] = data.formData.training_plan_description || ''
                } else if (docType.key === 'human_oversight') {
                  const ho = normalizeHumanOversightFormData(data.formData)
                  const supervisor = {
                    name: ho.supervisorName,
                    role: ho.supervisorRole,
                    email: ho.supervisorEmail
                  }
                  setSupervisorData(supervisor)
                  setInitialSupervisorData(supervisor)
                }
              }
            } else if (res.status === 400 || res.status === 404) {
              // Document not found or not applicable - this is expected for some documents like registry_proof
              console.log('[FETCH] Document not found:', docType.key, '(this is normal for optional documents)')
            } else {
              // Real error (500, 403, etc.)
              console.error('[FETCH] Failed to load:', docType.key, res.status)
            }
          })
        )

        setDocuments(docsData)
        setTextContents(textData)
        setInitialTextContents(textData)
      } catch (error) {
        console.error('Error fetching dossier data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, usecaseId, getAccessToken])

  // Auto-expand document section based on URL query parameter
  // `doc` (Todo / registry) est prioritaire ; `highlight` (Synthèse, Rapport, UnacceptableInterditsPanel) est alias.
  useEffect(() => {
    // Only run after data is loaded
    if (loading) return

    const rawDocParam = searchParams.get('doc') || searchParams.get('highlight')
    const docToExpand = rawDocParam ? resolveDossierSectionIdFromUrlParam(rawDocParam) : null
    if (docToExpand) {
      // Auto-expand the section
      setExpandedSections(prev => ({
        ...prev,
        [docToExpand]: true
      }))

      // Scroll to section after a short delay to allow expansion animation
      setTimeout(() => {
        const element = document.getElementById(`section-${docToExpand}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
  }, [loading, searchParams])

  const onUploadSuccess = () => {
    router.push(`/dashboard/${companyId}/dossiers`)
  }

  const handleTextSave = async (docType: string) => {
    if (!user) return

    try {
      setSaving({ ...saving, [docType]: true })
      const token = getAccessToken()
      if (!token) {
        console.error('No access token available')
        return
      }

      let formData: Record<string, any> = {}
      let status: 'incomplete' | 'complete' = 'incomplete'

      // Build formData based on docType
      if (docType === 'system_prompt') {
        formData = { system_instructions: textContents[docType] }
        status = textContents[docType] ? 'complete' : 'incomplete'
      } else if (docType === 'transparency_marking') {
        formData = { marking_description: textContents[docType] }
        status = textContents[docType] ? 'complete' : 'incomplete'
      } else if (docType === 'human_oversight') {
        formData = {
          supervisorName: supervisorData.name,
          supervisorRole: supervisorData.role,
          supervisorEmail: supervisorData.email
        }
        status = (supervisorData.name && supervisorData.role && supervisorData.email) ? 'complete' : 'incomplete'
      } else if (docType === 'training_plan') {
        const prev = documents[docType]?.formData as Record<string, unknown> | undefined
        formData = {
          ...(typeof prev === 'object' && prev ? prev : {}),
          training_plan_description: textContents[docType] ?? ''
        }
        const hasText = String(textContents[docType] ?? '').trim().length > 0
        const hasFile = Boolean(documents[docType]?.fileUrl)
        status = hasText || hasFile ? 'complete' : 'incomplete'
      }

      const payload = { formData, status }

      const res = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const saveResult = await res.json()

        // Check if score changed from this action
        if (saveResult.scoreChange) {
          setScoreChangePopup({
            previousScore: saveResult.scoreChange.previousScore,
            newScore: saveResult.scoreChange.newScore,
            pointsGained: saveResult.scoreChange.pointsGained,
            reason: saveResult.scoreChange.reason || 'Document de conformite ajoute'
          })

          // Update the local useCase score
          if (useCase && saveResult.scoreChange.newScore !== null) {
            setUseCase({
              ...useCase,
              score_final: saveResult.scoreChange.newScore
            })
          }
        }

        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setDocuments({ ...documents, [docType]: data })

          // Update initial values after successful save
          setInitialTextContents({ ...initialTextContents, [docType]: textContents[docType] })
          if (docType === 'human_oversight') {
            setInitialSupervisorData(supervisorData)
          }
        }
      }
    } catch (error) {
      console.error('Error saving text:', error)
    } finally {
      setSaving({ ...saving, [docType]: false })
    }
  }

  const handleFileUpload = async (docType: string, file: File) => {
    if (!user) return

    try {
      setUploading({ ...uploading, [docType]: true })
      const token = getAccessToken()
      if (!token) {
        console.error('No access token available')
        return
      }

      // Check storage limit BEFORE uploading
      const fileSizeMb = file.size / (1024 * 1024)
      const maxStorageMb = plan.maxStorageMb || 250

      // Fetch current storage usage
      const storageRes = await fetch(`/api/storage/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (storageRes.ok) {
        const storageData = await storageRes.json()
        const usedStorageMb = storageData.usedStorageMb

        if (usedStorageMb + fileSizeMb > maxStorageMb) {
          alert(
            `❌ Limite de stockage dépassée\n\n` +
            `Stockage actuel : ${usedStorageMb.toFixed(2)} Mo\n` +
            `Fichier : ${fileSizeMb.toFixed(2)} Mo\n` +
            `Limite du plan : ${maxStorageMb} Mo\n\n` +
            `Pour augmenter votre limite de stockage, veuillez passer à un plan supérieur.`
          )
          setUploading({ ...uploading, [docType]: false })
          return
        }
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/dossiers/${usecaseId}/${docType}/upload`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      if (res.ok) {
        const uploadResult = await res.json()

        // Check if score changed and show popup
        if (uploadResult.scoreChange) {
          setScoreChangePopup({
            previousScore: uploadResult.scoreChange.previousScore,
            newScore: uploadResult.scoreChange.newScore,
            pointsGained: uploadResult.scoreChange.pointsGained,
            reason: uploadResult.scoreChange.reason || 'Document de conformite ajoute'
          })

          // Update the use case score in local state
          if (useCase && uploadResult.scoreChange.newScore !== null) {
            setUseCase({
              ...useCase,
              score_final: uploadResult.scoreChange.newScore
            })
          }
        }

        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setDocuments({ ...documents, [docType]: data })
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Upload error:', errorData)
        alert(`Erreur lors de l'upload du fichier: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading({ ...uploading, [docType]: false })
    }
  }

  const handleFileDelete = async (docType: string) => {
    if (!user) return

    try {
      setDeleting({ ...deleting, [docType]: true })
      const token = getAccessToken()
      if (!token) {
        console.error('No access token available')
        return
      }

      const res = await fetch(`/api/dossiers/${usecaseId}/${docType}/upload`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const deleteResult = await res.json()

        // Show score change popup if score decreased
        if (deleteResult.scoreChange) {
          setScoreChangePopup({
            previousScore: deleteResult.scoreChange.previousScore,
            newScore: deleteResult.scoreChange.newScore,
            pointsGained: deleteResult.scoreChange.pointsGained,
            reason: deleteResult.scoreChange.reason || 'Document reinitialise'
          })

          // Update the local useCase score
          if (useCase && deleteResult.scoreChange.newScore !== null) {
            setUseCase({
              ...useCase,
              score_final: deleteResult.scoreChange.newScore
            })
          }
        }

        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setDocuments({ ...documents, [docType]: data })

        }
      } else {
        alert('Erreur lors de la suppression du fichier')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Erreur lors de la suppression du fichier')
    } finally {
      setDeleting({ ...deleting, [docType]: false })
    }
  }

  /**
   * Handles resetting a document to incomplete status.
   * Clears form data/text content and decreases score if applicable.
   */
  const handleReset = async (docType: string) => {
    if (!user) return

    const confirmReset = window.confirm(
      'Êtes-vous sûr de vouloir réinitialiser ce document ? Les points associés seront retirés de votre score.'
    )
    if (!confirmReset) return

    try {
      setResetting({ ...resetting, [docType]: true })
      const token = getAccessToken()
      if (!token) {
        console.error('No access token available')
        return
      }

      // Build empty formData based on docType
      let emptyFormData: Record<string, any> = {}
      if (docType === 'system_prompt') {
        emptyFormData = { system_instructions: '' }
      } else if (docType === 'transparency_marking') {
        emptyFormData = { marking_description: '' }
      } else if (docType === 'human_oversight') {
        emptyFormData = {
          supervisorName: '',
          supervisorRole: '',
          supervisorEmail: ''
        }
      } else if (docType === 'training_plan') {
        emptyFormData = { training_plan_description: '' }
      }

      const payload = { formData: emptyFormData, status: 'incomplete' }

      const res = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const resetResult = await res.json()

        // Show score change popup if score decreased
        if (resetResult.scoreChange) {
          setScoreChangePopup({
            previousScore: resetResult.scoreChange.previousScore,
            newScore: resetResult.scoreChange.newScore,
            pointsGained: resetResult.scoreChange.pointsGained,
            reason: resetResult.scoreChange.reason || 'Document reinitialise'
          })

          // Update the local useCase score
          if (useCase && resetResult.scoreChange.newScore !== null) {
            setUseCase({
              ...useCase,
              score_final: resetResult.scoreChange.newScore
            })
          }
        }

        // Clear local state
        if (docType === 'human_oversight') {
          const emptyData = { name: '', role: '', email: '' }
          setSupervisorData(emptyData)
          setInitialSupervisorData(emptyData)
        } else {
          setTextContents({ ...textContents, [docType]: '' })
          setInitialTextContents({ ...initialTextContents, [docType]: '' })
        }

        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setDocuments({ ...documents, [docType]: data })
        }
      } else {
        alert('Erreur lors de la réinitialisation du document')
      }
    } catch (error) {
      console.error('Error resetting document:', error)
      alert('Erreur lors de la réinitialisation du document')
    } finally {
      setResetting({ ...resetting, [docType]: false })
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'complete' || status === 'validated') {
      return <Check className="w-5 h-5 text-green-600" />
    }
    return <X className="w-5 h-5 text-red-500" />
  }

  const getStatusColor = (status: string) => {
    if (status === 'complete' || status === 'validated') {
      return 'bg-green-50 border-green-300'
    }
    return 'bg-red-50 border-red-200'
  }

  const canSave = (docType: DossierSectionUiDefinition) => {
    if (docType.type === 'textarea' || docType.type === 'mixed') {
      const currentContent = textContents[docType.key] || ''
      const initialContent = initialTextContents[docType.key] || ''

      // Must have content and it must be different from initial
      return currentContent.trim().length > 0 && currentContent !== initialContent
    }

    if (docType.type === 'form' && docType.key === 'human_oversight') {
      // All fields must be filled
      const hasAllFields = supervisorData.name.trim() &&
                          supervisorData.role.trim() &&
                          supervisorData.email.trim()

      // Must be different from initial values
      const hasChanged = supervisorData.name !== initialSupervisorData.name ||
                        supervisorData.role !== initialSupervisorData.role ||
                        supervisorData.email !== initialSupervisorData.email

      return hasAllFields && hasChanged
    }

    return false
  }

  /**
   * Checks if a document is currently in a completed/validated state
   */
  const isDocumentCompleted = (docTypeKey: string): boolean => {
    const doc = documents[docTypeKey]
    return doc?.status === 'complete' || doc?.status === 'validated'
  }

  /**
   * Returns the appropriate save button label based on document status
   */
  const getSaveButtonLabel = (docTypeKey: string): string => {
    return isDocumentCompleted(docTypeKey) ? 'Modifier' : 'Enregistrer'
  }

  /**
   * Returns the appropriate save button icon based on document status
   */
  const getSaveButtonIcon = (docTypeKey: string) => {
    return isDocumentCompleted(docTypeKey)
      ? <Pencil className="w-4 h-4 mr-2" />
      : <Check className="w-4 h-4 mr-2" />
  }

  const toggleSection = (docTypeKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [docTypeKey]: !prev[docTypeKey]
    }))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement du dossier...</p>
        </div>
      </div>
    )
  }

  const dossierEvalLongHref = withEvaluationEntree(`/usecases/${usecaseId}/evaluation`, 'dossier_detail_long')
  const dossierEvalShortHref = withEvaluationEntree(
    `/usecases/${usecaseId}/evaluation?parcours=court`,
    'dossier_detail_short'
  )
  const dossierV3EvalOrientation =
    useCase != null &&
    normalizeQuestionnaireVersion(useCase.questionnaire_version) === QUESTIONNAIRE_VERSION_V3 &&
    String(useCase.status || '').toLowerCase() !== 'completed'

  if (isUnacceptableCase && useCase) {
    const urgency = getDeploymentUrgency(useCase.deployment_date)
    const priorityHint = getUnacceptablePriorityHint(urgency)
    const orderedKeys = getUnacceptableActionDocTypesOrdered(useCase)
    const hasDatePriority = getUnacceptablePrimaryDocumentType(useCase) !== null

    const docMeta = (key: string) =>
      key === 'stopping_proof' ? getStoppingProofDossierSectionUi() : getSystemPromptDossierSectionUiUnacceptable()

    const statusLabel = (status: string) => {
      if (status === 'complete') return 'Déposé (complété)'
      if (status === 'validated') return 'Validé'
      return 'Manquant ou à compléter'
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${companyId}/dossiers`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
              Retour aux dossiers
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-gray-900">{usecaseName}</h1>
                <Link
                  href={`/usecases/${usecaseId}`}
                  className="mt-2 inline-block text-sm font-medium text-[#0080A3] hover:text-[#006280] underline-offset-2 hover:underline"
                >
                  Retour au cas d&apos;usage
                </Link>
                <p className="text-gray-600 mt-2">Dossier — cas à risque inacceptable</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {dossierV3EvalOrientation && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-4 text-sm text-gray-800">
              <p className="font-semibold text-gray-900 mb-1">
                {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3OrientationTitle}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3OrientationLead}
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Link
                  href={dossierEvalLongHref}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0080A3] text-white font-medium text-sm hover:bg-[#006280]"
                >
                  {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3CtaLong}
                </Link>
                <Link
                  href={dossierEvalShortHref}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50"
                >
                  {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3CtaShort}
                </Link>
              </div>
            </div>
          )}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                Ce cas d&apos;usage présente un niveau de risque inacceptable selon l&apos;AI Act.
                Les deux actions ci-dessous sont requises ; la date de déploiement sert uniquement à
                prioriser l&apos;urgence affichée.
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium text-amber-900 mb-1">Priorité et urgence</p>
            <p>{priorityHint}</p>
          </div>

          {editingDeploymentDate ? (
            <DateEditStep
              value={deploymentDateDraft}
              onChange={setDeploymentDateDraft}
              onSave={handleSaveDeploymentDate}
              onCancel={() => setEditingDeploymentDate(false)}
              saving={savingDeploymentDate}
            />
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-blue-900">Date de déploiement enregistrée</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {formatDate(useCase.deployment_date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeploymentDateDraft(formatDateForInput(useCase.deployment_date))
                    setEditingDeploymentDate(true)
                  }}
                  className="px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 font-medium text-sm self-start"
                >
                  Modifier la date
                </button>
              </div>
            </div>
          )}

          {loadingNextSteps && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#0080A3] mr-3" />
              <p className="text-sm text-gray-600">Chargement de la synthèse du risque…</p>
            </div>
          )}

          {!loadingNextSteps && nextSteps?.evaluation && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <h4 className="font-semibold text-red-900">Justification du niveau de risque</h4>
              </div>
              <MarkdownText text={nextSteps.evaluation} className="text-sm text-red-800 pl-7 mb-4" />
              <div className="pl-7 pt-3 border-t border-red-200">
                <button
                  type="button"
                  onClick={() => router.push(dossierEvalLongHref)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Modifier l&apos;évaluation
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orderedKeys.map((docKey, index) => {
              const docType = docMeta(docKey)
              const doc =
                documents[docType.key] || {
                  status: 'incomplete' as const,
                  formData: null,
                  fileUrl: null,
                  updatedAt: null
                }
              const isPrimary = hasDatePriority && index === 0
              const isSaving = saving[docType.key]
              const isUploading = uploading[docType.key]

              return (
                <div
                  key={docType.key}
                  id={`section-${docType.key}`}
                  className={`bg-white rounded-xl shadow-sm border ${
                    isPrimary
                      ? 'ring-2 ring-orange-300 border-orange-200'
                      : 'border-gray-200'
                  } ${getStatusColor(doc.status)}`}
                >
                  <div
                    className="flex items-start justify-between p-6 cursor-pointer"
                    onClick={() => toggleSection(docType.key)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getStatusIcon(doc.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{docType.label}</h3>
                          {hasDatePriority ? (
                            isPrimary ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                                Action prioritaire
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                Également requis
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                              Action requise
                            </span>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              onMouseEnter={() => setShowInfoTooltip(docType.key)}
                              onMouseLeave={() => setShowInfoTooltip(null)}
                              onClick={e => e.stopPropagation()}
                              className="text-gray-400 hover:text-[#0080A3] transition-colors"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            {showInfoTooltip === docType.key && (
                              <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                {docType.helpInfo}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{docType.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{statusLabel(doc.status)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                          expandedSections[docType.key] ? 'rotate-180' : ''
                        }`}
                      />
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          doc.status === 'complete' || doc.status === 'validated'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {doc.status === 'complete'
                          ? '✓ Complété'
                          : doc.status === 'validated'
                            ? '✓ Validé'
                            : '✗ Incomplet'}
                      </span>
                    </div>
                  </div>

                  {docType.type === 'textarea' && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                        opacity: expandedSections[docType.key] ? 1 : 0
                      }}
                    >
                      <div className="space-y-3 px-6 pb-6">
                        <label className="block text-sm font-medium text-gray-700">Instructions système</label>
                        <textarea
                          value={textContents[docType.key] || ''}
                          onChange={e =>
                            setTextContents({ ...textContents, [docType.key]: e.target.value })
                          }
                          placeholder="Collez ici l'intégralité du prompt système..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent font-mono text-sm"
                          rows={8}
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleTextSave(docType.key)}
                            disabled={isSaving || !canSave(docType)}
                            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                {getSaveButtonIcon(docType.key)}
                                {getSaveButtonLabel(docType.key)}
                              </>
                            )}
                          </button>
                          {isDocumentCompleted(docType.key) && (
                            <button
                              type="button"
                              onClick={() => handleReset(docType.key)}
                              disabled={resetting[docType.key] || false}
                              className="inline-flex items-center px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {resetting[docType.key] ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Réinitialisation...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Réinitialiser
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                          {doc.fileUrl ? (
                            <UploadedFileDisplay
                              fileUrl={doc.fileUrl}
                              onDelete={() => handleFileDelete(docType.key)}
                              isDeleting={deleting[docType.key] || false}
                            />
                          ) : (
                            <>
                              <ComplianceFileUpload
                                label="Ou importer un fichier"
                                helpText={`Formats acceptés: ${docType.acceptedFormats}`}
                                acceptedFormats={docType.acceptedFormats}
                                onFileSelected={file => handleFileUpload(docType.key, file)}
                              />
                              {isUploading && (
                                <div className="mt-3 flex items-center text-sm text-gray-600">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Upload en cours...
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {docType.type === 'file' && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                        opacity: expandedSections[docType.key] ? 1 : 0
                      }}
                    >
                      <div className="space-y-3 px-6 pb-6">
                        {doc.fileUrl ? (
                          <UploadedFileDisplay
                            fileUrl={doc.fileUrl}
                            onDelete={() => handleFileDelete(docType.key)}
                            isDeleting={deleting[docType.key] || false}
                          />
                        ) : (
                          <>
                            <ComplianceFileUpload
                              label="Importer un document"
                              helpText={`Formats acceptés: ${docType.acceptedFormats} (max 10MB)`}
                              acceptedFormats={docType.acceptedFormats}
                              onFileSelected={file => handleFileUpload(docType.key, file)}
                            />
                            {isUploading && (
                              <div className="mt-3 flex items-center text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Upload en cours...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <ContactHelpCard usecaseId={usecaseId} companyId={companyId} userProfile={userProfile} />
        </div>

        {scoreChangePopup && (
          <ScoreEvolutionPopup
            previousScore={scoreChangePopup.previousScore}
            newScore={scoreChangePopup.newScore}
            pointsGained={scoreChangePopup.pointsGained}
            reason={scoreChangePopup.reason}
            onClose={() => setScoreChangePopup(null)}
            todoListUrl={`/dashboard/${companyId}/dossiers`}
            usecaseDossierUrl={`/dashboard/${companyId}/dossiers/${usecaseId}`}
          />
        )}
      </div>
    )
  }

  // Sinon, afficher la liste normale des documents de conformité
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${companyId}/dossiers`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
            Retour aux dossiers
          </button>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#0080A3] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-gray-900">{usecaseName}</h1>
              <Link
                href={`/usecases/${usecaseId}`}
                className="mt-2 inline-block text-sm font-medium text-[#0080A3] hover:text-[#006280] underline-offset-2 hover:underline"
              >
                Retour au cas d&apos;usage
              </Link>
              <p className="text-gray-600 mt-2">{DECLARATION_PROOF_FLOW_COPY.dossierDetailSubtitle}</p>
              <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-relaxed">
                {DECLARATION_PROOF_FLOW_COPY.filRougeBody}{' '}
                <a
                  href={`/dashboard/${companyId}/todo-list`}
                  className="text-[#0080A3] font-medium hover:underline underline-offset-2"
                >
                  {DECLARATION_PROOF_FLOW_COPY.linkLabelTodo}
                </a>
                .
              </p>
              {useCase && (
                <p className="mt-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClassificationRiskPillClasses(
                      useCase.classification_status,
                      useCase.risk_level ?? null
                    )}`}
                  >
                    {getClassificationRiskDisplayLabel(
                      useCase.classification_status,
                      useCase.risk_level ?? null
                    )}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dossierV3EvalOrientation && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-4 text-sm text-gray-800 mb-6">
            <p className="font-semibold text-gray-900 mb-1">
              {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3OrientationTitle}
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3OrientationLead}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Link
                href={dossierEvalLongHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0080A3] text-white font-medium text-sm hover:bg-[#006280]"
              >
                {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3CtaLong}
              </Link>
              <Link
                href={dossierEvalShortHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50"
              >
                {DECLARATION_PROOF_FLOW_COPY.globalDossierDetailV3CtaShort}
              </Link>
            </div>
          </div>
        )}
        <div className="space-y-6">
          {STANDARD_DOSSIER_SECTIONS.map((docType) => {
            const doc = documents[docType.key] || { status: 'incomplete', formData: null, fileUrl: null, updatedAt: null }
            const isSaving = saving[docType.key]
            const isUploading = uploading[docType.key]

            // Special handling for registry_proof when MaydAI is declared as registry
            if (docType.key === 'registry_proof' && company?.maydai_as_registry === true) {
              const hasComplementaryDoc = doc.fileUrl || (doc.formData && Object.keys(doc.formData).length > 0)
              return (
                <div
                  key={docType.key}
                  id={`section-${docType.key}`}
                  className="bg-white rounded-xl shadow-sm border border-green-300 bg-green-50/50"
                >
                  <div className="flex items-start justify-between p-6 flex-wrap gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{docType.label}</h3>
                          <RegistreMaydaiBadge />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Complété automatiquement - Vous avez déclaré MaydAI comme votre registre centralisé.
                        </p>
                        <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-300">
                          <p className="text-sm text-green-800">
                            ✓ MaydAI est déclaré comme votre registre centralisé. Cette exigence est automatiquement satisfaite.
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300 whitespace-nowrap">
                      ✓ Complété
                    </span>
                  </div>
                  {/* Document complémentaire déjà uploadé */}
                  {hasComplementaryDoc && doc.fileUrl && (
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-sm font-medium text-gray-700 mb-2">Document complémentaire</p>
                      <UploadedFileDisplay
                        fileUrl={doc.fileUrl}
                        onDelete={() => handleFileDelete(docType.key)}
                        isDeleting={deleting[docType.key] || false}
                      />
                    </div>
                  )}
                  {/* Option : ajouter un document complémentaire */}
                  <div className="px-6 pb-6 border-t border-green-200/60 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleSection(docType.key)}
                      className="text-sm font-medium text-[#0080A3] hover:text-[#006280] flex items-center gap-2"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections[docType.key] ? 'rotate-180' : ''}`} />
                      {hasComplementaryDoc ? 'Modifier le document complémentaire' : 'Ajouter un document complémentaire (optionnel)'}
                    </button>
                    {expandedSections[docType.key] && (
                      <div className="mt-3">
                        <ComplianceFileUpload
                          label="Importer un document"
                          helpText="Formats acceptés: .pdf,.png,.jpg,.jpeg (max 10MB)"
                          acceptedFormats=".pdf,.png,.jpg,.jpeg"
                          onFileSelected={(file) => handleFileUpload(docType.key, file)}
                        />
                        {isUploading && (
                          <div className="mt-3 flex items-center text-sm text-gray-600">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Upload en cours...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={docType.key}
                id={`section-${docType.key}`}
                className={`bg-white rounded-xl shadow-sm border ${getStatusColor(doc.status)}`}
              >
                <div 
                  className="flex items-start justify-between p-6 cursor-pointer"
                  onClick={() => toggleSection(docType.key)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{docType.label}</h3>
                        <div className="relative">
                          <button
                            onMouseEnter={() => setShowInfoTooltip(docType.key)}
                            onMouseLeave={() => setShowInfoTooltip(null)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-[#0080A3] transition-colors"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {showInfoTooltip === docType.key && (
                            <div className="absolute left-0 top-6 z-10 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                              {docType.helpInfo}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{docType.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        expandedSections[docType.key] ? 'rotate-180' : ''
                      }`}
                    />
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      doc.status === 'complete' || doc.status === 'validated'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {doc.status === 'complete' ? '✓ Complété' : doc.status === 'validated' ? '✓ Validé' : '✗ Incomplet'}
                    </span>
                  </div>
                </div>

                {/* Section for Prompt System (textarea) */}
                {docType.type === 'textarea' && (
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                      opacity: expandedSections[docType.key] ? 1 : 0
                    }}
                  >
                    <div className="space-y-3 px-6 pb-6">
                      <label className="block text-sm font-medium text-gray-700">
                        Instructions système
                      </label>
                      <textarea
                        value={textContents[docType.key] || ''}
                        onChange={(e) => setTextContents({ ...textContents, [docType.key]: e.target.value })}
                        placeholder="Collez ici l'intégralité du prompt système..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent font-mono text-sm"
                        rows={8}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleTextSave(docType.key)}
                          disabled={isSaving || !canSave(docType)}
                          className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              {getSaveButtonIcon(docType.key)}
                              {getSaveButtonLabel(docType.key)}
                            </>
                          )}
                        </button>
                        {isDocumentCompleted(docType.key) && (
                          <button
                            onClick={() => handleReset(docType.key)}
                            disabled={resetting[docType.key] || false}
                            className="inline-flex items-center px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {resetting[docType.key] ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Réinitialisation...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Réinitialiser
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {docType.acceptedFormats && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          {doc.fileUrl ? (
                            <UploadedFileDisplay
                              fileUrl={doc.fileUrl}
                              onDelete={() => handleFileDelete(docType.key)}
                              isDeleting={deleting[docType.key] || false}
                            />
                          ) : (
                            <>
                              <ComplianceFileUpload
                                label="Ou importer un fichier"
                                helpText={`Formats acceptés: ${docType.acceptedFormats}`}
                                acceptedFormats={docType.acceptedFormats}
                                onFileSelected={(file) => handleFileUpload(docType.key, file)}
                              />
                              {isUploading && (
                                <div className="mt-3 flex items-center text-sm text-gray-600">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Upload en cours...
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section for Human Oversight (form) */}
                {docType.type === 'form' && (
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                      opacity: expandedSections[docType.key] ? 1 : 0
                    }}
                  >
                    <div className="space-y-4 px-6 pb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom complet <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={supervisorData.name}
                          onChange={(e) => setSupervisorData({ ...supervisorData, name: e.target.value })}
                          placeholder="ex: Marie Dupont"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Poste / Rôle <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={supervisorData.role}
                          onChange={(e) => setSupervisorData({ ...supervisorData, role: e.target.value })}
                          placeholder="ex: Responsable Conformité IA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email de contact <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={supervisorData.email}
                          onChange={(e) => setSupervisorData({ ...supervisorData, email: e.target.value })}
                          placeholder="ex: marie.dupont@entreprise.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleTextSave(docType.key)}
                          disabled={isSaving || !canSave(docType)}
                          className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              {getSaveButtonIcon(docType.key)}
                              {getSaveButtonLabel(docType.key)}
                            </>
                          )}
                        </button>
                        {isDocumentCompleted(docType.key) && (
                          <button
                            onClick={() => handleReset(docType.key)}
                            disabled={resetting[docType.key] || false}
                            className="inline-flex items-center px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {resetting[docType.key] ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Réinitialisation...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Réinitialiser
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section for Transparency Marking (mixed: text + image) */}
                {docType.type === 'mixed' && (
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                      opacity: expandedSections[docType.key] ? 1 : 0
                    }}
                  >
                    <div className="space-y-4 px-6 pb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {docType.textLabel || 'Description'}
                        </label>
                        <textarea
                          value={textContents[docType.key] || ''}
                          onChange={(e) => setTextContents({ ...textContents, [docType.key]: e.target.value })}
                          placeholder={docType.textPlaceholder || 'Entrez une description...'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleTextSave(docType.key)}
                          disabled={isSaving || !canSave(docType)}
                          className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              {getSaveButtonIcon(docType.key)}
                              {getSaveButtonLabel(docType.key)} la description
                            </>
                          )}
                        </button>
                        {isDocumentCompleted(docType.key) && (
                          <button
                            onClick={() => handleReset(docType.key)}
                            disabled={resetting[docType.key] || false}
                            className="inline-flex items-center px-4 py-2 bg-white text-red-600 font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {resetting[docType.key] ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Réinitialisation...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Réinitialiser
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        {doc.fileUrl ? (
                          <UploadedFileDisplay
                            fileUrl={doc.fileUrl}
                            onDelete={() => handleFileDelete(docType.key)}
                            isDeleting={deleting[docType.key] || false}
                          />
                        ) : (
                          <>
                            <ComplianceFileUpload
                              label={docType.fileLabel || 'Fichier (optionnel)'}
                              helpText={`${docType.fileHelpText || 'Document associé'}. Formats acceptés: ${docType.acceptedFormats}`}
                              acceptedFormats={docType.acceptedFormats}
                              onFileSelected={(file) => handleFileUpload(docType.key, file)}
                            />
                            {isUploading && (
                              <div className="mt-3 flex items-center text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Upload en cours...
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section for File Upload Only */}
                {docType.type === 'file' && (
                  <div 
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ 
                      maxHeight: expandedSections[docType.key] ? '2000px' : '0',
                      opacity: expandedSections[docType.key] ? 1 : 0
                    }}
                  >
                    <div className="space-y-3 px-6 pb-6">
                      {doc.fileUrl ? (
                        <UploadedFileDisplay
                          fileUrl={doc.fileUrl}
                          onDelete={() => handleFileDelete(docType.key)}
                          isDeleting={deleting[docType.key] || false}
                        />
                      ) : (
                        <>
                          <ComplianceFileUpload
                            label="Importer un document"
                            helpText={`Formats acceptés: ${docType.acceptedFormats} (max 10MB)`}
                            acceptedFormats={docType.acceptedFormats}
                            onFileSelected={(file) => handleFileUpload(docType.key, file)}
                          />
                          {isUploading && (
                            <div className="mt-3 flex items-center text-sm text-gray-600">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Upload en cours...
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Score Evolution Popup */}
      {scoreChangePopup && (
        <ScoreEvolutionPopup
          previousScore={scoreChangePopup.previousScore}
          newScore={scoreChangePopup.newScore}
          pointsGained={scoreChangePopup.pointsGained}
          reason={scoreChangePopup.reason}
          onClose={() => setScoreChangePopup(null)}
          todoListUrl={`/dashboard/${companyId}/dossiers`}
          usecaseDossierUrl={`/dashboard/${companyId}/dossiers/${usecaseId}`}
        />
      )}
    </div>
  )
}
