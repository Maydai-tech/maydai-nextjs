'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { useApiCall } from '@/lib/api-client-legacy'
import { ArrowLeft, FileText, Check, Loader2, Info, ChevronDown, X, AlertTriangle } from 'lucide-react'
import ComplianceFileUpload from '@/components/ComplianceFileUpload'
import UploadedFileDisplay from '@/components/UploadedFileDisplay'
import ScoreEvolutionPopup from '@/components/ScoreEvolutionPopup'
import { useUnacceptableCaseWorkflow } from '@/hooks/useUnacceptableCaseWorkflow'
import UnacceptableCaseWorkflowSteps from '@/components/UnacceptableCase/UnacceptableCaseWorkflowSteps'

const SYSTEM_PROMPT_DOC = {
  key: 'system_prompt',
  label: 'Instructions Système et Prompts Principaux',
  description: 'Veuillez coller ici l\'intégralité du prompt système (instructions de base) donné à l\'IA pour ce cas d\'usage.',
  helpInfo: 'Tracer les instructions exactes données à l\'IA (le "system prompt" ou les instructions de base) pour garantir la reproductibilité et l\'auditabilité du comportement de l\'IA. Si le prompt est dynamique, fournissez le modèle (template) et expliquez les variables.',
  acceptedFormats: '.txt,.md',
  type: 'textarea' as const
}

const STOPPING_PROOF_DOC = {
  key: 'stopping_proof',
  label: 'Preuve d\'Arrêt du Système',
  description: 'Document prouvant que le système à risque inacceptable a été arrêté ou n\'a jamais été déployé.',
  helpInfo: 'Document officiel attestant de l\'arrêt du système d\'IA identifié comme présentant un risque inacceptable selon l\'AI Act. Peut inclure : procès-verbal d\'arrêt, capture d\'écran de désactivation, attestation du responsable technique, ou tout autre élément prouvant la cessation d\'activité.',
  acceptedFormats: '.pdf,.png,.jpg,.jpeg',
  type: 'file' as const
}

const REGISTRY_PROOF_DOC = {
  key: 'registry_proof',
  label: 'Preuve d\'Usage du Registre Centralisé',
  description: 'Document prouvant l\'utilisation d\'un registre centralisé pour vos systèmes d\'IA.',
  helpInfo: 'Document attestant de l\'utilisation d\'un registre centralisé conforme à l\'AI Act pour le suivi de vos systèmes d\'IA. Peut inclure : capture d\'écran du registre, attestation du responsable, export de données du registre, ou tout autre élément prouvant son utilisation effective.',
  acceptedFormats: '.pdf,.png,.jpg,.jpeg',
  type: 'file' as const
}

const DOC_TYPES = [
  SYSTEM_PROMPT_DOC,
  {
    key: 'technical_documentation',
    label: 'Documentation Technique du Système',
    description: 'Uploadez la documentation décrivant le modèle, ses capacités et ses limitations (max 10MB).',
    helpInfo: 'Document décrivant : le(s) modèle(s) d\'IA sous-jacents (ex: "GPT-4o", "Claude 3 Sonnet"), l\'architecture générale, les capacités prévues, et surtout les limitations connues (risques d\'hallucination, biais potentiels, etc.).',
    acceptedFormats: '.pdf,.docx,.md',
    type: 'file'
  },
  {
    key: 'human_oversight',
    label: 'Responsable de la Surveillance Humaine',
    description: 'Désignez la personne physique responsable de la supervision du système d\'IA.',
    helpInfo: 'Assurer l\'accountability (responsabilité) en désignant une personne claire, responsable de la supervision "human-in-the-loop" ou de l\'audit a posteriori.',
    acceptedFormats: '',
    type: 'form'
  },
  {
    key: 'transparency_marking',
    label: 'Marquage de Transparence IA',
    description: 'Décrivez comment le contenu généré par l\'IA est marqué comme tel (ex: "Généré par IA", watermark, disclaimer).',
    helpInfo: 'Prouver que l\'utilisateur final est informé qu\'il interagit avec une IA (transparence), comme l\'exige l\'IA Act. Vous pouvez fournir une description textuelle et/ou un exemple visuel (capture d\'écran).',
    acceptedFormats: '.png,.jpg,.jpeg,.gif',
    type: 'mixed'
  },
  {
    key: 'risk_management',
    label: 'Plan de Gestion des Risques',
    description: 'Uploadez votre registre des risques et le plan de mitigation associé.',
    helpInfo: 'Documenter que les risques potentiels (biais, sécurité, confidentialité, mauvais usage) ont été identifiés et que des mesures sont en place pour les atténuer. Typiquement un tableau listant : Risque identifié, Probabilité, Impact, et Mesure de mitigation.',
    acceptedFormats: '.pdf,.docx,.xlsx',
    type: 'file'
  },
  {
    key: 'data_quality',
    label: 'Procédure de Qualité des Données',
    description: 'Décrivez comment vous assurez la qualité, la pertinence et l\'absence de biais dans les données d\'entraînement ou de RAG.',
    helpInfo: 'Démontrer que les données utilisées (pour l\'entraînement, le fine-tuning, ou le RAG) sont de bonne qualité, non biaisées et gérées correctement. Incluez : source des données, méthodes de nettoyage et d\'anonymisation, processus de validation.',
    acceptedFormats: '.pdf,.docx',
    type: 'file'
  },
  {
    key: 'continuous_monitoring',
    label: 'Plan de Surveillance Continue (Monitoring)',
    description: 'Comment suivez-vous les performances et la sécurité du système en production ?',
    helpInfo: 'Prouver que le système n\'est pas "lancé et oublié". Document détaillant : les métriques (KPIs) de performance suivies, la fréquence des audits, la procédure en cas de détection d\'anomalie ou de risque émergent.',
    acceptedFormats: '.pdf,.docx',
    type: 'file'
  },
  REGISTRY_PROOF_DOC
]

interface DocumentData {
  formData: Record<string, any> | null
  fileUrl: string | null
  status: 'incomplete' | 'complete' | 'validated'
  updatedAt: string | null
}

interface UseCase {
  id: string
  name: string
  risk_level: string
  score_final?: number | null
  deployment_date?: string | null
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
  const [showInfoTooltip, setShowInfoTooltip] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [scoreChangePopup, setScoreChangePopup] = useState<{
    previousScore: number | null
    newScore: number | null
    pointsGained: number
    reason: string
  } | null>(null)

  // Hook pour le workflow "cas inacceptable"
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

  const getInitialProofUploaded = () => {
    if (!useCase?.deployment_date) return false

    const deploymentDate = new Date(useCase.deployment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Date dans le passé → vérifier stopping_proof
    if (deploymentDate < today) {
      return documents['stopping_proof']?.status === 'complete' ||
             documents['stopping_proof']?.status === 'validated'
    }

    // Date dans le futur → vérifier system_prompt (texte OU fichier)
    return (documents['system_prompt']?.status === 'complete' ||
            documents['system_prompt']?.status === 'validated') ||
           !!documents['system_prompt']?.fileUrl
  }

  const workflow = useUnacceptableCaseWorkflow({
    useCase,
    isOpen: isUnacceptableCase,
    onUpdateDeploymentDate: updateDeploymentDate,
    initialProofUploaded: getInitialProofUploaded(),
    onReloadDocument: reloadDocument
  })

  // Synchroniser proofUploaded avec les documents chargés
  useEffect(() => {
    console.log('[SYNC] useEffect triggered', {
      hasUseCase: !!useCase,
      hasDeploymentDate: !!useCase?.deployment_date,
      documents: documents
    })

    if (!useCase?.deployment_date) return

    const deploymentDate = new Date(useCase.deployment_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log('[SYNC] Dates comparison', {
      deploymentDate: deploymentDate.toISOString(),
      today: today.toISOString(),
      isInPast: deploymentDate < today
    })

    let shouldBeUploaded = false

    if (deploymentDate < today) {
      shouldBeUploaded = documents['stopping_proof']?.status === 'complete' ||
                        documents['stopping_proof']?.status === 'validated'
      console.log('[SYNC] Past deployment - checking stopping_proof', {
        status: documents['stopping_proof']?.status,
        shouldBeUploaded
      })
    } else {
      shouldBeUploaded = (documents['system_prompt']?.status === 'complete' ||
                         documents['system_prompt']?.status === 'validated') ||
                        !!documents['system_prompt']?.fileUrl
      console.log('[SYNC] Future deployment - checking system_prompt', {
        status: documents['system_prompt']?.status,
        fileUrl: documents['system_prompt']?.fileUrl,
        shouldBeUploaded
      })
    }

    console.log('[SYNC] Final decision', {
      shouldBeUploaded,
      currentProofUploaded: workflow.proofUploaded,
      willUpdate: shouldBeUploaded !== workflow.proofUploaded
    })

    if (shouldBeUploaded !== workflow.proofUploaded) {
      console.log('[SYNC] Setting proofUploaded to:', shouldBeUploaded)
      workflow.setProofUploaded(shouldBeUploaded)

      // Also set the correct workflow step based on deployment date
      if (shouldBeUploaded) {
        const correctStep = deploymentDate < today ? 'upload-proof' : 'future-deployment-warning'
        console.log('[SYNC] Setting workflow step to:', correctStep)
        workflow.setStep(correctStep)
      }
    }
  }, [useCase, documents, workflow])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Recharger le document stopping_proof OU system_prompt quand uploadé et auto-expand la section
  useEffect(() => {
    const refetchDocument = async () => {
      if (!workflow.proofUploaded || !user) return

      const token = getAccessToken()
      if (!token) return

      try {
        // Déterminer quel document recharger selon le step du workflow
        const docKey = workflow.step === 'future-deployment-warning' ? 'system_prompt' : 'stopping_proof'

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

          // Auto-expand la section du document
          setExpandedSections(prev => ({ ...prev, [docKey]: true }))
        }
      } catch (error) {
        console.error('Error fetching document:', error)
      }
    }

    refetchDocument()
  }, [workflow.proofUploaded, workflow.step, user, usecaseId, getAccessToken])

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

        // Fetch all documents (including stopping_proof for unacceptable cases)
        const docsData: Record<string, DocumentData> = {}
        const textData: Record<string, string> = {}

        // List of doc types to fetch
        const docTypesToFetch = [...DOC_TYPES]
        // Add stopping_proof if it's an unacceptable case
        if (usecaseData?.risk_level?.toLowerCase() === 'unacceptable') {
          docTypesToFetch.push(STOPPING_PROOF_DOC)
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
                } else if (docType.key === 'human_oversight') {
                  const supervisor = {
                    name: data.formData.supervisorName || '',
                    role: data.formData.supervisorRole || '',
                    email: data.formData.supervisorEmail || ''
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
  useEffect(() => {
    // Only run after data is loaded
    if (loading) return

    const docToExpand = searchParams.get('doc')
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
        // Refresh document data
        const getRes = await fetch(`/api/dossiers/${usecaseId}/${docType}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setDocuments({ ...documents, [docType]: data })

          // Si c'est un cas inacceptable et qu'on supprime system_prompt/stopping_proof,
          // revenir au workflow en réinitialisant proofUploaded
          if (isUnacceptableCase && (docType === 'system_prompt' || docType === 'stopping_proof')) {
            workflow.reset()
          }
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

  const canSave = (docType: typeof DOC_TYPES[0]) => {
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

  // Si c'est un cas inacceptable, afficher toujours le workflow dédié (avant ET après upload)
  if (isUnacceptableCase && useCase) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => router.push(`/dashboard/${companyId}/dossiers`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux dossiers
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{usecaseName}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Warning Message */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                Ce cas d'usage présente un niveau de risque inacceptable selon l'AI Act.
                Vous devez procéder à une analyse approfondie de la conformité de ce cas d'usage.
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 mt-6">
            <UnacceptableCaseWorkflowSteps
              workflow={workflow}
              deploymentDate={useCase.deployment_date}
              usecaseId={usecaseId}
              uploadedDocument={
                workflow.step === 'future-deployment-warning'
                  ? documents['system_prompt']
                  : documents['stopping_proof']
              }
              onReloadDocument={reloadDocument}
            />
          </div>
        </div>
      </div>
    )
  }

  // Désactivé : ne plus afficher la vue simplifiée quand proofUploaded = true
  // Maintenant le document s'affiche dans le workflow lui-même
  if (false && isUnacceptableCase && useCase && workflow.proofUploaded) {
    // Déterminer quel document afficher selon le workflow step
    console.log('[RENDER] Displaying document - step:', workflow.step, 'proofUploaded:', workflow.proofUploaded)
    const docToDisplay = workflow.step === 'future-deployment-warning'
      ? SYSTEM_PROMPT_DOC
      : STOPPING_PROOF_DOC
    console.log('[RENDER] Document to display:', docToDisplay.key, docToDisplay.label)

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => router.push(`/dashboard/${companyId}/dossiers`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux dossiers
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{usecaseName}</h1>
                <p className="text-gray-600">Dossier de conformité - Cas inacceptable</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {[docToDisplay].map((docType) => {
              const doc = documents[docType.key] || { status: 'incomplete', formData: null, fileUrl: null, updatedAt: null }
              const isUploading = uploading[docType.key]

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

                  {/* Section for Textarea (system_prompt) */}
                  {docType.type === 'textarea' && (
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
                                disabled={saving[docType.key] || !canSave(docType)}
                                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {saving[docType.key] ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enregistrement...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Enregistrer
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Séparateur OU */}
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex-1 border-t border-gray-300"></div>
                                <span className="text-sm text-gray-500 font-medium">OU</span>
                                <div className="flex-1 border-t border-gray-300"></div>
                              </div>

                              <ComplianceFileUpload
                                label="Importer un fichier"
                                helpText={`Formats acceptés: ${docType.acceptedFormats}`}
                                acceptedFormats={docType.acceptedFormats}
                                onFileSelected={(file) => handleFileUpload(docType.key, file)}
                              />
                              {uploading[docType.key] && (
                                <div className="mt-3 flex items-center text-sm text-gray-600">
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Upload en cours...
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section for File Upload (stopping_proof) */}
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
            onClick={() => router.push(`/dashboard/${companyId}/dossiers`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux dossiers
          </button>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#0080A3]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{usecaseName}</h1>
              <p className="text-gray-600">Dossier de conformité réglementaire</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {DOC_TYPES.map((docType) => {
            const doc = documents[docType.key] || { status: 'incomplete', formData: null, fileUrl: null, updatedAt: null }
            const isSaving = saving[docType.key]
            const isUploading = uploading[docType.key]

            // Special handling for registry_proof when MaydAI is declared as registry
            if (docType.key === 'registry_proof' && company?.maydai_as_registry === true) {
              return (
                <div
                  key={docType.key}
                  id={`section-${docType.key}`}
                  className="bg-white rounded-xl shadow-sm border bg-green-50 border-green-300"
                >
                  <div className="flex items-start justify-between p-6">
                    <div className="flex items-start gap-3 flex-1">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{docType.label}</h3>
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
                              <Check className="w-4 h-4 mr-2" />
                              Enregistrer
                            </>
                          )}
                        </button>
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
                            <Check className="w-4 h-4 mr-2" />
                            Enregistrer
                          </>
                        )}
                      </button>
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
                          Description du marquage
                        </label>
                        <textarea
                          value={textContents[docType.key] || ''}
                          onChange={(e) => setTextContents({ ...textContents, [docType.key]: e.target.value })}
                          placeholder="Décrivez comment le contenu généré par l'IA est marqué..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                          rows={4}
                        />
                      </div>
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
                            <Check className="w-4 h-4 mr-2" />
                            Enregistrer la description
                          </>
                        )}
                      </button>

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
                              label="Exemple visuel (optionnel)"
                              helpText={`Capture d'écran montrant le marquage. Formats acceptés: ${docType.acceptedFormats}`}
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
