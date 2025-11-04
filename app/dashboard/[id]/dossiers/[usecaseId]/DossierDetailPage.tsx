'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { ArrowLeft, FileText, Check, Loader2, Info, ChevronDown, X } from 'lucide-react'
import ComplianceFileUpload from '@/components/ComplianceFileUpload'
import UploadedFileDisplay from '@/components/UploadedFileDisplay'

const DOC_TYPES = [
  {
    key: 'system_prompt',
    label: 'Instructions Système et Prompts Principaux',
    description: 'Veuillez coller ici l\'intégralité du prompt système (instructions de base) donné à l\'IA pour ce cas d\'usage.',
    helpInfo: 'Tracer les instructions exactes données à l\'IA (le "system prompt" ou les instructions de base) pour garantir la reproductibilité et l\'auditabilité du comportement de l\'IA. Si le prompt est dynamique, fournissez le modèle (template) et expliquez les variables.',
    acceptedFormats: '.txt,.md',
    type: 'textarea'
  },
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
  }
]

interface DocumentData {
  formData: Record<string, any> | null
  fileUrl: string | null
  status: 'incomplete' | 'complete' | 'validated'
  updatedAt: string | null
}

export default function DossierDetailPage() {
  const { user, loading: authLoading, getAccessToken } = useAuth()
  const { plan } = useUserPlan()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string
  const usecaseId = params.usecaseId as string

  const [usecaseName, setUsecaseName] = useState<string>('')
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
        if (usecaseRes.ok) {
          const usecaseData = await usecaseRes.json()
          setUsecaseName(usecaseData.name || 'Cas d\'usage')
        }

        // Fetch all documents
        const docsData: Record<string, DocumentData> = {}
        const textData: Record<string, string> = {}

        await Promise.all(
          DOC_TYPES.map(async (docType) => {
            const res = await fetch(`/api/dossiers/${usecaseId}/${docType.key}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
              const data = await res.json()
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

            return (
              <div
                key={docType.key}
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
    </div>
  )
}
