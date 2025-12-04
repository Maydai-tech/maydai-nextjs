'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { RiskLevelBadge } from '../components/overview/RiskLevelBadge'
import { useRiskLevel } from '../hooks/useRiskLevel'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { useNextSteps } from '../hooks/useNextSteps'
import { usePDFExport } from '../hooks/usePDFExport'
import { getScoreStyle } from '@/lib/score-styles'
import { AlertTriangle, RefreshCcw, Download, ArrowRight } from 'lucide-react'
import { getCompanyStatusLabel, getCompanyStatusDefinition, getRiskLevelJustification } from '../utils/company-status'
import UnacceptableCaseModal from '@/components/Shared/UnacceptableCaseModal'
import { useUnacceptableCaseWorkflow } from '@/hooks/useUnacceptableCaseWorkflow'
import { useApiCall } from '@/lib/api-client-legacy'

// Mapping des actions du rapport vers les types de documents de la todo-list
const ACTION_TO_DOCTYPE: Record<string, string> = {
  quick_win_1: 'registry_action',
  quick_win_2: 'human_oversight',
  quick_win_3: 'system_prompt',
  priorite_1: 'technical_documentation',
  priorite_2: 'transparency_marking',
  priorite_3: 'data_quality',
  action_1: 'risk_management',
  action_2: 'continuous_monitoring',
  // action_3: à définir plus tard
}

// Hook pour récupérer les informations de profil de l'utilisateur
function useUserProfile() {
  const { user, session } = useAuth()
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !session?.access_token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Profile fetched:', data)
          setProfile(data)
        } else {
          console.error('Failed to fetch profile:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, session?.access_token])

  return { profile, loading }
}

export default function UseCaseRapportPage() {
  const { user, loading, getAccessToken } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const api = useApiCall()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)
  const [documents, setDocuments] = useState<Record<string, any>>({})
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [showUnacceptableModal, setShowUnacceptableModal] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { nextSteps, loading: nextStepsLoading, error: nextStepsError, refetch: refetchNextSteps } = useNextSteps({
    usecaseId: useCaseId,
    useCaseStatus: useCase?.status,
    useCaseUpdatedAt: useCase?.updated_at
  })
  const { goToEvaluation, goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')
  const { riskLevel, loading: riskLoading, error: riskError } = useRiskLevel(useCaseId)
  const { score, loading: scoreLoading, error: scoreError } = useUseCaseScore(useCaseId)
  const { isGenerating, error: pdfError, generatePDF } = usePDFExport(useCaseId)

  // Logique pour cas inacceptable
  const isUnacceptableCase = riskLevel === 'unacceptable'

  const updateDeploymentDate = async (date: string) => {
    if (!useCase) return
    const result = await api.put(`/api/usecases/${useCase.id}`, {
      deployment_date: date
    })
    if (result.data) {
      // Recharger useCase ou mettre à jour localement
      window.location.reload()
    }
  }

  const reloadDocument = async (docKey: string) => {
    if (!user) return
    const token = getAccessToken()
    if (!token) return

    try {
      const res = await fetch(`/api/dossiers/${useCaseId}/${docKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()

        // Mettre à jour les documents et recalculer la modal
        setDocuments(prev => {
          const updatedDocs = { ...prev, [docKey]: data }

          // Recalculer si la modal doit s'afficher
          if (useCase?.deployment_date) {
            const deploymentDate = new Date(useCase.deployment_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let shouldShowModal = false
            if (deploymentDate < today) {
              // Date dans le passé → vérifier stopping_proof
              shouldShowModal = !(updatedDocs['stopping_proof']?.status === 'complete' ||
                                 updatedDocs['stopping_proof']?.status === 'validated')
            } else {
              // Date dans le futur → vérifier system_prompt
              shouldShowModal = !((updatedDocs['system_prompt']?.status === 'complete' ||
                                  updatedDocs['system_prompt']?.status === 'validated') ||
                                 !!updatedDocs['system_prompt']?.fileUrl)
            }

            console.log('[reloadDocument] Recalculating modal:', {
              docKey,
              deploymentDate: deploymentDate.toISOString(),
              today: today.toISOString(),
              isInPast: deploymentDate < today,
              stoppingProofStatus: updatedDocs['stopping_proof']?.status,
              systemPromptStatus: updatedDocs['system_prompt']?.status,
              shouldShowModal
            })

            setShowUnacceptableModal(shouldShowModal)
          }

          return updatedDocs
        })
      }
    } catch (error) {
      console.error('Error reloading document:', error)
    }
  }

  const handleDeleteDocument = async () => {
    if (!user || !useCase) return
    const token = getAccessToken()
    if (!token) return

    // Déterminer quel document supprimer selon la date
    const deploymentDate = new Date(useCase.deployment_date || '')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const docKey = deploymentDate < today ? 'stopping_proof' : 'system_prompt'

    try {
      const res = await fetch(`/api/dossiers/${useCaseId}/${docKey}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        // Recharger le document pour mettre à jour l'état
        await reloadDocument(docKey)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  // Calculer initialProofUploaded basé sur le state documents
  const getInitialProofUploaded = () => {
    if (!useCase?.deployment_date) {
      console.log('[getInitialProofUploaded] No deployment date')
      return false
    }

    const deploymentDate = new Date(useCase.deployment_date)
    deploymentDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Date dans le passé → vérifier stopping_proof
    if (deploymentDate < today) {
      const hasProof = documents['stopping_proof']?.status === 'complete' ||
                       documents['stopping_proof']?.status === 'validated'
      console.log('[getInitialProofUploaded] Past date - stopping_proof status:', documents['stopping_proof']?.status, 'hasProof:', hasProof)
      return hasProof
    }

    // Date dans le futur → vérifier system_prompt
    const hasPrompt = (documents['system_prompt']?.status === 'complete' ||
                       documents['system_prompt']?.status === 'validated') ||
                      !!documents['system_prompt']?.fileUrl
    console.log('[getInitialProofUploaded] Future date - system_prompt status:', documents['system_prompt']?.status, 'hasPrompt:', hasPrompt)
    return hasPrompt
  }

  // Calculer initialProofUploaded pour le workflow
  const initialProofUploaded = getInitialProofUploaded()

  const workflow = useUnacceptableCaseWorkflow({
    useCase: useCase ? {
      id: useCase.id,
      name: useCase.name,
      risk_level: riskLevel ?? undefined,
      score_final: score?.score ?? null,
      deployment_date: useCase.deployment_date ?? null
    } : null,
    isOpen: isUnacceptableCase && showUnacceptableModal,
    onUpdateDeploymentDate: updateDeploymentDate,
    initialProofUploaded
  })

  // Log pour debug
  useEffect(() => {
    console.log('[rapport] State changed:', {
      isUnacceptableCase,
      showUnacceptableModal,
      hasStoppingProof: documents['stopping_proof']?.status,
      hasSystemPrompt: documents['system_prompt']?.status,
      initialProofUploaded,
      workflowProofUploaded: workflow.proofUploaded
    })
  }, [isUnacceptableCase, showUnacceptableModal, documents, initialProofUploaded, workflow.proofUploaded])

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Charger les documents pour les cas inacceptables
  useEffect(() => {
    const loadDocuments = async () => {
      console.log('[loadDocuments] Starting document load check:', {
        mounted,
        hasUser: !!user,
        loadingData,
        riskLoading,
        isUnacceptableCase,
        hasUseCase: !!useCase,
        useCaseId: useCase?.id
      })

      // Attendre que tout soit prêt (mounted, user, useCase, riskLevel)
      if (!mounted || !user || loadingData || riskLoading) {
        console.log('[loadDocuments] Waiting for prerequisites')
        return
      }

      // Si pas un cas inacceptable, pas besoin de charger les documents
      if (!isUnacceptableCase) {
        console.log('[loadDocuments] Not an unacceptable case, skipping')
        setLoadingDocuments(false)
        return
      }

      // Si pas encore de useCase, on attend
      if (!useCase) {
        console.log('[loadDocuments] No useCase yet')
        return
      }

      const token = getAccessToken()
      if (!token) {
        console.log('[loadDocuments] No token available')
        setLoadingDocuments(false)
        return
      }

      console.log('[loadDocuments] Starting to fetch documents for useCase:', useCaseId)

      try {
        // Charger stopping_proof et system_prompt
        const [stoppingProofRes, systemPromptRes] = await Promise.all([
          fetch(`/api/dossiers/${useCaseId}/stopping_proof`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`/api/dossiers/${useCaseId}/system_prompt`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])

        const docs: Record<string, any> = {}
        if (stoppingProofRes.ok) {
          docs['stopping_proof'] = await stoppingProofRes.json()
        }
        if (systemPromptRes.ok) {
          docs['system_prompt'] = await systemPromptRes.json()
        }
        setDocuments(docs)

        // Déterminer immédiatement si on doit montrer la modal
        const deploymentDate = new Date(useCase.deployment_date || '')
        deploymentDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        console.log('[loadDocuments] Date comparison:', {
          deploymentDate: deploymentDate.toISOString(),
          today: today.toISOString(),
          isPast: deploymentDate < today
        })

        let shouldShowModal = false
        if (useCase.deployment_date) {
          if (deploymentDate < today) {
            // Date dans le passé → vérifier stopping_proof
            shouldShowModal = !(docs['stopping_proof']?.status === 'complete' ||
                               docs['stopping_proof']?.status === 'validated')
            console.log('[loadDocuments] Past deployment - stopping_proof status:', docs['stopping_proof']?.status, 'shouldShowModal:', shouldShowModal)
          } else {
            // Date dans le futur → vérifier system_prompt
            shouldShowModal = !((docs['system_prompt']?.status === 'complete' ||
                                docs['system_prompt']?.status === 'validated') ||
                               !!docs['system_prompt']?.fileUrl)
            console.log('[loadDocuments] Future deployment - system_prompt status:', docs['system_prompt']?.status, 'fileUrl:', docs['system_prompt']?.fileUrl, 'shouldShowModal:', shouldShowModal)
          }
        } else {
          console.log('[loadDocuments] No deployment date defined')
        }

        console.log('[loadDocuments] Final shouldShowModal:', shouldShowModal)
        setShowUnacceptableModal(shouldShowModal)
      } catch (error) {
        console.error('Error loading documents:', error)
      } finally {
        setLoadingDocuments(false)
      }
    }

    loadDocuments()
  }, [mounted, user, loadingData, riskLoading, isUnacceptableCase, useCase, useCaseId, getAccessToken])

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData || riskLoading) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage n'a pas pu être chargé."}
          </p>
          <button
            onClick={goToCompanies}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  // Redirect to evaluation if still draft
  if (useCase.status?.toLowerCase() === 'draft') {
    return (
      <UseCaseLayout useCase={useCase}>
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Évaluation requise
          </h2>
          <p className="text-gray-600 mb-6">
            Ce cas d'usage doit d'abord être évalué avant de pouvoir consulter le rapport.
          </p>
          <button
            onClick={goToEvaluation}
            className="inline-flex items-center px-6 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Commencer l'évaluation
          </button>
        </div>
      </UseCaseLayout>
    )
  }

  // Fonction pour formater le nom de l'auditeur
  const getAuditorName = () => {
    console.log('Profile data for auditor name:', profile)
    
    if (profile?.email) {
      console.log('Using email:', profile.email)
      return profile.email
    } else {
      console.log('Using fallback name')
      return 'MaydAI - Équipe Conformité'
    }
  }

  return (
    <UseCaseLayout useCase={useCase}>
      <div className="space-y-6 sm:space-y-8">
        {/* Section d'informations du rapport d'audit */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">
              Rapport d'Audit Préliminaire du Système d'IA : <span className="text-[#0080a3]">{useCase.name || 'Nom du Cas d\'usage IA'}</span>
            </h2>
            
            {/* Bouton de téléchargement PDF */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Message d'erreur PDF */}
          {pdfError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erreur de génération PDF</h3>
                  <p className="text-sm text-red-700 mt-1">{pdfError}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Entreprise :</span>
                <span className="text-gray-900">{useCase.companies?.name || 'Nom de l\'entreprise'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Date du Rapport :</span>
                <span className="text-gray-900">
                  {useCase.last_calculation_date 
                    ? new Date(useCase.last_calculation_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Audité par :</span>
                <span className="text-gray-900">
                  {profileLoading ? 'Chargement...' : getAuditorName()}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Service concerné :</span>
                <span className="text-gray-900">{useCase.responsible_service || 'Nom du service'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1. Résumé Exécutif */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            1. Résumé Exécutif
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Ce rapport réalisé par l'entreprise <strong className="text-[#0080a3]">{useCase.companies?.name || '[Nom de l\'entreprise]'}</strong> présente les conclusions d'un audit préliminaire du système d'IA <strong className="text-[#0080a3]">{useCase.name || '[Nom du système]'}</strong> au regard des exigences du règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 établissant des règles harmonisées concernant l'intelligence artificielle « AI Act ».
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Statut de l'entreprise :</strong> <span className="text-[#0080a3]">{getCompanyStatusLabel(useCase.company_status)}</span>
            </p>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border mb-4">
              <p className="font-medium text-gray-800 mb-2">Définition IA Act :</p>
              <p className="text-gray-700 leading-relaxed">{getCompanyStatusDefinition(useCase.company_status)}</p>
            </div>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Résumé du cas d'usage :</strong> {useCase.description || '[Description du cas d\'usage]'}
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              L'objectif de cet audit préliminaire est d'identifier les domaines de conformité actuels et les lacunes, afin de proposer des actions correctives immédiates (quick wins) et des plans d'action à moyen et long terme, en soulignant les spécificités des grands modèles linguistiques (LLM) et de leur transparence.
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Une partie des conclusions de cette évaluation est basée sur les tests effectués par l'équipe MayDAI sur les principaux LLM dont <strong className="text-[#0080a3]">{useCase.compl_ai_models?.model_name || useCase.llm_model_version || '[Nom du modèle utilisé]'}</strong>. Si certaines lacunes en matière de robustesse, de sécurité, de diversité et d'équité peuvent être relevées, d'autres informations demandées par l'AI Act ne sont pas encore disponibles (ou transmises par les technologies concernées).
            </p>
            
            <p className="text-base leading-relaxed text-gray-800">
              Ce rapport vise à fournir une feuille de route aux entreprises pour naviguer dans ce paysage réglementaire complexe.
            </p>
          </div>
        </div>

        {/* Section 2. Classification du système d'IA */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            2. Classification du système d'IA
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              L'AI Act adopte une approche fondée sur les risques, classifiant les systèmes d'IA en différentes catégories selon leur niveau de risque. Cette classification détermine les obligations réglementaires applicables.
            </p>
            
            {/* Badges de classification et score */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Badge Niveau IA Act */}
              <div className="flex-1">
                {riskLoading ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="relative">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">--</div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
                        <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                        Analyse en cours...
                      </div>
                    </div>
                  </div>
                ) : riskError || !riskLevel ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                      <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
                      <div className="text-xs text-gray-500">Non disponible</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        riskLevel === 'unacceptable' ? 'bg-red-500' :
                        riskLevel === 'high' ? 'bg-orange-500' :
                        riskLevel === 'limited' ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}></div>
                      Niveau IA Act
                    </h3>
                    
                    <div className={`rounded-xl p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${
                      riskLevel === 'unacceptable' ? 'bg-red-50 border-red-200' :
                      riskLevel === 'high' ? 'bg-orange-50 border-orange-200' :
                      riskLevel === 'limited' ? 'bg-amber-50 border-amber-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-center relative">
                        <div className={`text-3xl font-bold mb-2 ${
                          riskLevel === 'unacceptable' ? 'text-red-800' :
                          riskLevel === 'high' ? 'text-orange-800' :
                          riskLevel === 'limited' ? 'text-amber-800' :
                          'text-green-800'
                        }`}>
                          {riskLevel === 'unacceptable' ? 'Inacceptable' :
                           riskLevel === 'high' ? 'Élevé' :
                           riskLevel === 'limited' ? 'Limité' :
                           'Minimal'}
                        </div>
                        
                        {riskLevel === 'unacceptable' && (
                          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Interdit
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Badge Score de conformité */}
              <div className="flex-1">
                {scoreLoading ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Score de conformité
                    </h3>
                    <div className="relative">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">--</div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
                        <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                        Recalcul en cours...
                      </div>
                    </div>
                  </div>
                ) : scoreError || !score ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Score de conformité
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                      <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
                      <div className="text-xs text-gray-500">Non disponible</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getScoreStyle(score.score).indicator}`}></div>
                      Score de conformité
                    </h3>
                    
                    <div className={`${getScoreStyle(score.score).bg} rounded-xl p-4 border ${getScoreStyle(score.score).border} ${getScoreStyle(score.score).shadow} shadow-sm hover:shadow-md transition-all duration-200`}>
                      <div className="text-center relative">
                        <div className={`text-3xl font-bold ${getScoreStyle(score.score).text} mb-2`}>
                          {Math.round(score.score)}
                        </div>
                        
                        {score.is_eliminated && (
                          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Éliminé
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Justification du niveau de risque */}
            {riskLevel && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Justification du niveau de risque</h4>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <p>{getRiskLevelJustification(riskLevel)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            3. Évaluation de la Conformité et Actions Recommandées
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              Cette section évalue la conformité du système d'IA aux exigences de l'AI Act, structurée autour des six principes éthiques et techniques clés. Pour chaque point, des quick wins (actions rapides) et des actions à mener sont proposées.
            </p>
          </div>
        </div>

        {/* Section : Recommandations et plan d'action */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Recommandations et plan d'action
          </h2>
          
          {/* Bande d'information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Rapport généré le {useCase?.updated_at ? new Date(useCase.updated_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Date non disponible'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Généré par IA</span>
              </div>
            </div>
          </div>
          
          {nextStepsLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des recommandations...</p>
            </div>
          )}

          {nextStepsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <p className="text-sm text-red-700 mt-1">{nextStepsError}</p>
                </div>
              </div>
            </div>
          )}

          {nextSteps && (
            <div className="space-y-6">
              {/* Introduction */}
              {nextSteps.introduction && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Introduction</h3>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                      {nextSteps.introduction}
                    </p>
                  </div>
                </div>
              )}

              {/* Évaluation du niveau de risque AI Act */}
              {nextSteps.evaluation && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/low-performance.png" 
                      alt="Évaluation du risque" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Évaluation du niveau de risque AI Act</h3>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                      {nextSteps.evaluation}
                    </p>
                  </div>
                </div>
              )}

              {/* Priorités d'actions réglementaires */}
              {nextSteps.priorite_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/icons/attention.png"
                      alt="Actions prioritaires"
                      width={24}
                      height={24}
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Il est impératif de mettre en œuvre les mesures suivantes :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Les 3 priorités d'actions réglementaires</h4>
                  <ul className="space-y-3 mb-4 ml-4">
                    {[
                      { key: 'priorite_1', value: nextSteps.priorite_1 },
                      { key: 'priorite_2', value: nextSteps.priorite_2 },
                      { key: 'priorite_3', value: nextSteps.priorite_3 }
                    ]
                      .filter(item => Boolean(item.value))
                      .map((item, index) => {
                        const docType = ACTION_TO_DOCTYPE[item.key]
                        const todoUrl = docType && useCase?.company_id
                          ? `/dashboard/${useCase.company_id}/todo-list?usecase=${useCaseId}&action=${docType}`
                          : null
                        return (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-start gap-2">
                            <span className="text-[#0080a3] text-6xl leading-none mt-[-0.3em]">•</span>
                            <span className="flex-1">{item.value}</span>
                            {todoUrl && (
                              <button
                                onClick={() => router.push(todoUrl)}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors whitespace-nowrap"
                              >
                                Voir l'action
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}

              {/* Quick wins */}
              {nextSteps.quick_win_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/icons/work-in-progress.png"
                      alt="Actions rapides"
                      width={24}
                      height={24}
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Trois actions concrètes à mettre en œuvre rapidement :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Quick wins & actions immédiates recommandées</h4>
                  <ul className="space-y-3 mb-4 ml-4">
                    {[
                      { key: 'quick_win_1', value: nextSteps.quick_win_1 },
                      { key: 'quick_win_2', value: nextSteps.quick_win_2 },
                      { key: 'quick_win_3', value: nextSteps.quick_win_3 }
                    ]
                      .filter(item => Boolean(item.value))
                      .map((item, index) => {
                        const docType = ACTION_TO_DOCTYPE[item.key]
                        const todoUrl = docType && useCase?.company_id
                          ? `/dashboard/${useCase.company_id}/todo-list?usecase=${useCaseId}&action=${docType}`
                          : null
                        return (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-start gap-2">
                            <span className="text-[#0080a3] text-6xl leading-none mt-[-0.3em]">•</span>
                            <span className="flex-1">{item.value}</span>
                            {todoUrl && (
                              <button
                                onClick={() => router.push(todoUrl)}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors whitespace-nowrap"
                              >
                                Voir l'action
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}

              {/* Actions moyen terme */}
              {nextSteps.action_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/icons/schedule.png"
                      alt="Actions à moyen terme"
                      width={24}
                      height={24}
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Trois actions structurantes à mener dans les 3 à 6 mois :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Actions à moyen terme</h4>
                  <ul className="space-y-3 mb-4 ml-4">
                    {[
                      { key: 'action_1', value: nextSteps.action_1 },
                      { key: 'action_2', value: nextSteps.action_2 },
                      { key: 'action_3', value: nextSteps.action_3 }
                    ]
                      .filter(item => Boolean(item.value))
                      .map((item, index) => {
                        const docType = ACTION_TO_DOCTYPE[item.key]
                        const todoUrl = docType && useCase?.company_id
                          ? `/dashboard/${useCase.company_id}/todo-list?usecase=${useCaseId}&action=${docType}`
                          : null
                        return (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-start gap-2">
                            <span className="text-[#0080a3] text-6xl leading-none mt-[-0.3em]">•</span>
                            <span className="flex-1">{item.value}</span>
                            {todoUrl && (
                              <button
                                onClick={() => router.push(todoUrl)}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors whitespace-nowrap"
                              >
                                Voir l'action
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}

              {/* Impact attendu */}
              {nextSteps.impact && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/administrative-law.png" 
                      alt="Impact attendu" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Impact attendu</h3>
                  </div>
                  <p className="text-base leading-relaxed text-gray-800">{nextSteps.impact}</p>
                </div>
              )}

              {/* Conclusion */}
              {nextSteps.conclusion && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Conclusion</h3>
                  <p className="text-base leading-relaxed text-gray-800">{nextSteps.conclusion}</p>
                </div>
              )}
            </div>
          )}

          {!nextSteps && !nextStepsLoading && !nextStepsError && (
            <div className="text-center py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Aucune recommandation disponible</h3>
                <p className="text-blue-700">
                  Les recommandations détaillées seront générées automatiquement une fois le questionnaire d'évaluation complété.
                </p>
              </div>
            </div>
          )}
        </div>


        {/* Section 4. Recommandations Générales */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            4. Recommandations Générales
          </h2>
          
          <div className="space-y-6">
            {/* Intégration par design */}
            <div className="flex items-start">
              <img 
                src="/icons/compass-icon.png" 
                alt="Intégration par design" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Intégration « par design »</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Intégrer les principes de l'AI Act dès la conception des produits et services IA pour assurer la pérennité et la compétitivité.
                </p>
              </div>
            </div>

            {/* Évaluation Continue */}
            <div className="flex items-start">
              <img 
                src="/icons/audit.png" 
                alt="Évaluation Continue" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Évaluation Continue</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  L'AI est une technologie en évolution rapide. Il est crucial de procéder à des évaluations régulières et d'adapter les systèmes et les processus de conformité en continu.
                </p>
              </div>
            </div>

            {/* Formation */}
            <div className="flex items-start">
              <img 
                src="/icons/authenticity.png" 
                alt="Formation" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Formation</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Sensibiliser et former toutes les équipes (développement, juridique, conformité, gestion) aux exigences de l'AI Act et aux meilleures pratiques en matière d'IA éthique et transparente.
                </p>
              </div>
            </div>

            {/* Outils de Conformité */}
            <div className="flex items-start">
              <img 
                src="/icons/authorization.png" 
                alt="Outils de Conformité" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Outils de Conformité</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Utiliser des boîtes à outils dédiées (telles que celles de MaydAI ou le cadre COMPL-AI) pour faciliter l'identification des systèmes, la classification des risques, la cartographie des obligations réglementaires et la gestion des risques.
                </p>
              </div>
            </div>

            {/* Bac à Sable Réglementaire */}
            <div className="flex items-start">
              <img 
                src="/icons/sandbox.png" 
                alt="Bac à Sable Réglementaire" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Bac à Sable Réglementaire</h3>
                <div className="text-gray-800 text-sm leading-relaxed">
                  <p className="mb-3">
                    Envisager la participation à des « bacs à sable réglementaires » (regulatory sandboxes) pour développer et tester des systèmes d'IA innovants sous supervision réglementaire, ce qui peut renforcer la sécurité juridique et accélérer l'accès au marché pour les PME.
                  </p>
                  <a 
                    href="https://artificialintelligenceact.eu/fr/article/57/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#0080a3] hover:text-[#006080] underline font-medium"
                  >
                    En savoir plus sur les bacs à sable réglementaires
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Collaboration */}
            <div className="flex items-start">
              <img 
                src="/icons/teamwork.png" 
                alt="Collaboration" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Collaboration</h3>
                <div className="text-gray-800 text-sm leading-relaxed">
                  <p className="mb-3">
                    Participer aux efforts de standardisation et de développement de codes de bonne pratique, encouragés par le Bureau de l'IA.
                  </p>
                  <a 
                    href="https://digital-strategy.ec.europa.eu/fr/policies/ai-office" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#0080a3] hover:text-[#006080] underline font-medium"
                  >
                    Découvrir le Bureau de l'IA
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Section 6. Références Légales Clés — déplacée vers l'onglet Annexes */}

      </div>

      {/* Modal pour cas inacceptable - bloquante tant que documents non uploadés */}
      {isUnacceptableCase && useCase && (
        <UnacceptableCaseModal
          isOpen={showUnacceptableModal}
          onClose={() => {
            // Permet la fermeture uniquement si la preuve a été uploadée
            if (workflow.proofUploaded) {
              setShowUnacceptableModal(false)
            }
          }}
          useCase={{
            id: useCase.id,
            name: useCase.name,
            risk_level: riskLevel ?? undefined,
            score_final: score?.score ?? null,
            deployment_date: useCase.deployment_date ?? null
          }}
          onUpdateDeploymentDate={updateDeploymentDate}
          blockClosing={!workflow.proofUploaded}
          onReloadDocument={reloadDocument}
          uploadedDocument={
            workflow.step === 'future-deployment-warning'
              ? documents['system_prompt']
              : documents['stopping_proof']
          }
        />
      )}
    </UseCaseLayout>
  )
}