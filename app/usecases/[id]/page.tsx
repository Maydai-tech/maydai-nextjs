'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from './hooks/useUseCaseData'
import { useUseCaseNavigation } from './utils/navigation'
import { UseCaseLayout } from './components/shared/UseCaseLayout'
import { UseCaseLoader } from './components/shared/UseCaseLoader'
import { UseCaseDetails } from './components/overview/UseCaseDetails'
import { UseCaseSidebar } from './components/overview/UseCaseSidebar'
import { useNextSteps } from './hooks/useNextSteps'
import { useRiskLevel } from './hooks/useRiskLevel'
import { useUseCaseScore } from './hooks/useUseCaseScore'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { getScoreStyle } from '@/lib/score-styles'
import { RiskLevelBadge } from './components/overview/RiskLevelBadge'
import { getCompanyStatusLabel, getCompanyStatusDefinition } from './utils/company-status'
import UnacceptableCaseModal from '@/components/Shared/UnacceptableCaseModal'
import { useUnacceptableCaseWorkflow } from '@/hooks/useUnacceptableCaseWorkflow'
import { supabase } from '@/lib/supabase'


export default function UseCaseDetailPage() {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  // Récupération des données du use case avec état de recalcul
  const { useCase, progress, loading: loadingData, error, updateUseCase, updating, isRecalculating } = useUseCaseData(useCaseId)
  const { goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

  // Hooks pour les sections extraites - seulement si useCase est chargé
  const { nextSteps, loading: nextStepsLoading, error: nextStepsError, isGenerating: nextStepsGenerating } = useNextSteps({
    usecaseId: useCase?.id || '',
    useCaseStatus: useCase?.status,
    useCaseUpdatedAt: useCase?.updated_at
  })
  const { riskLevel, loading: riskLoading, error: riskError } = useRiskLevel(useCase?.id || '')
  const { score, loading: scoreLoading, error: scoreError } = useUseCaseScore(useCase?.id || '')

  // État pour la modal cas inacceptable
  const [documents, setDocuments] = useState<Record<string, any>>({})
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [showUnacceptableModal, setShowUnacceptableModal] = useState(false)

  const isUnacceptableCase = riskLevel === 'unacceptable'

  // Fonction pour mettre à jour la date de déploiement
  const updateDeploymentDate = async (newDate: string) => {
    if (!useCase) return
    await updateUseCase({ deployment_date: newDate })
  }

  // Fonction pour recharger un document
  const reloadDocument = async (docKey: string) => {
    const token = session?.access_token
    if (!token || !useCase) return

    try {
      const res = await fetch(`/api/dossiers/${useCase.id}/${docKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const doc = await res.json()
        setDocuments(prev => ({ ...prev, [docKey]: doc }))
      }
    } catch (error) {
      console.error(`Error reloading ${docKey}:`, error)
    }
  }

  // Fonction pour supprimer un document
  const deleteDocument = async () => {
    // Reload after deletion
    await reloadDocument('stopping_proof')
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
      risk_level: riskLevel,
      score_final: score?.score,
      deployment_date: useCase.deployment_date
    } : null,
    isOpen: isUnacceptableCase && showUnacceptableModal,
    onUpdateDeploymentDate: updateDeploymentDate,
    initialProofUploaded
  })

  // Log pour debug
  useEffect(() => {
    console.log('[page] State changed:', {
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

      const token = session?.access_token
      if (!token) {
        console.log('[loadDocuments] No token available')
        setLoadingDocuments(false)
        return
      }

      console.log('[loadDocuments] Starting to fetch documents for useCase:', useCaseId, 'with token:', !!token)

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
  }, [mounted, user, loadingData, riskLoading, isUnacceptableCase, useCase, useCaseId, session?.access_token])

  // Auto-redirect logic removed - now handled in dashboard click

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d'usage non trouvé</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès."}
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

  return (
    <UseCaseLayout 
      useCase={useCase}
      onUpdateUseCase={updateUseCase}
      updating={updating}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Grid principal avec contenu et sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <UseCaseDetails 
            useCase={useCase} 
            onUpdateUseCase={updateUseCase}
            updating={updating}
          />

          {/* Sidebar avec transmission de l'état de recalcul */}
          <UseCaseSidebar useCase={useCase} onUpdateUseCase={updateUseCase} isRecalculating={isRecalculating} />
        </div>

        {/* Sections en pleine largeur */}
        <div className="space-y-6 sm:space-y-8">
          {/* Rapport d'Audit Préliminaire */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Rapport d'Audit Préliminaire
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

          {/* Classification du système d'IA */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Classification du système d'IA
            </h2>
            
            <div className="prose prose-gray max-w-none">
              <p className="text-base leading-relaxed text-gray-800 mb-6">
                L'AI Act adopte une approche fondée sur les risques, classifiant les systèmes d'IA en différentes catégories selon leur niveau de risque. Cette classification détermine les obligations réglementaires applicables.
              </p>
              
              {/* Badges de classification et score */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Badge Niveau IA Act */}
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <RiskLevelBadge 
                      riskLevel={riskLevel} 
                      loading={riskLoading} 
                      error={riskError}
                      className="w-full"
                    />
                  </div>
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
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreStyle(score.score).text} mb-2`}>
                            {Math.round(score.score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recommandations et plan d'action */}
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Recommandations et plan d'action
            </h2>

            {/* Métadonnées de génération */}
            {nextSteps?.generated_at && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        Rapport généré le {new Date(nextSteps.generated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Généré par IA</span>
                  </div>
                </div>
              </div>
            )}
            
            {(nextStepsLoading || nextStepsGenerating) && !nextSteps && (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="animate-spin h-12 w-12 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 bg-white rounded-full"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Génération du rapport d'analyse en cours...
                </h3>
                <p className="text-gray-600 mb-4">
                  Notre IA analyse vos réponses et prépare des recommandations personnalisées
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-blue-700">
                    Temps estimé : 30 à 60 secondes
                  </span>
                </div>
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
                    <ul className="space-y-2 mb-4 ml-4">
                      {[nextSteps.priorite_1, nextSteps.priorite_2, nextSteps.priorite_3]
                        .filter(Boolean)
                        .map((action, index) => (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                            <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                            <span className="flex-1">
                              {action}
                            </span>
                          </li>
                        ))}
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
                    <ul className="space-y-2 mb-4 ml-4">
                      {[nextSteps.quick_win_1, nextSteps.quick_win_2, nextSteps.quick_win_3]
                        .filter(Boolean)
                        .map((action, index) => (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                            <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                            <span className="flex-1">
                              {action}
                            </span>
                          </li>
                        ))}
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
                    <ul className="space-y-2 mb-4 ml-4">
                      {[nextSteps.action_1, nextSteps.action_2, nextSteps.action_3]
                        .filter(Boolean)
                        .map((action, index) => (
                          <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                            <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                            <span className="flex-1">
                              {action}
                            </span>
                          </li>
                        ))}
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal cas inacceptable */}
      <UnacceptableCaseModal
        isOpen={isUnacceptableCase && showUnacceptableModal}
        onClose={() => setShowUnacceptableModal(false)}
        useCase={useCase ? {
          id: useCase.id,
          name: useCase.name,
          risk_level: riskLevel,
          score_final: score?.score,
          deployment_date: useCase.deployment_date
        } : null}
        onUpdateDeploymentDate={updateDeploymentDate}
        updating={updating}
        blockClosing={false}
        onReloadDocument={reloadDocument}
        onDeleteDocument={deleteDocument}
        uploadedDocument={documents['stopping_proof'] || documents['system_prompt']}
      />
    </UseCaseLayout>
  )
} 