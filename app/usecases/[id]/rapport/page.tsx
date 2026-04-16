'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { useUseCaseRisk } from '../context/UseCaseRiskContext'
import type { UseCase } from '../types/usecase'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { useNextSteps } from '../hooks/useNextSteps'
import { usePDFExport } from '../hooks/usePDFExport'
import { getScoreStyle } from '@/lib/score-styles'
import { AlertTriangle, RefreshCcw, Download, HelpCircle } from 'lucide-react'
import { getCompanyStatusLabel, getCompanyStatusDefinition, getRiskLevelJustification } from '../utils/company-status'
import UnacceptableInterditsPanel from '@/components/UnacceptableCase/UnacceptableInterditsPanel'
import { useUnacceptableInterdit1Source } from '@/hooks/useUnacceptableInterdit1Source'
import { useDocumentStatuses } from '../hooks/useDocumentStatuses'
import { useCompanyInfo } from '../hooks/useCompanyInfo'
import { useQuestionnaireSlotStatuses } from '../hooks/useQuestionnaireSlotStatuses'
import { ReportStandardPlanBlocks } from '../components/report/ReportStandardPlanBlocks'
import { V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER } from '@/lib/classification-risk-display'
import { getNextStepsRecommendationsPhase } from '../utils/nextsteps-ux-state'

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

interface UseCaseRapportMainContentProps {
  useCase: UseCase
  useCaseId: string
  profile: { first_name?: string; last_name?: string; email?: string } | null
  profileLoading: boolean
  session: { access_token?: string } | null
}

function UseCaseRapportMainContent({
  useCase,
  useCaseId,
  profile,
  profileLoading,
  session,
}: UseCaseRapportMainContentProps) {
  const { riskLevel, classificationStatus, loading: riskLoading, error: riskError } = useUseCaseRisk()
  const classificationForNextSteps = classificationStatus ?? useCase.classification_status ?? null
  const {
    nextSteps,
    loading: nextStepsLoading,
    error: nextStepsError,
    syncStalled: nextStepsSyncStalled,
    refetch: refetchNextSteps,
  } = useNextSteps({
    usecaseId: useCase.id,
    useCaseStatus: useCase.status,
    useCaseUpdatedAt: useCase.updated_at,
    reportGeneratedAt: useCase.report_generated_at ?? null,
    parentReportGenerating: false,
    classificationStatus: classificationForNextSteps,
  })
  const { score, loading: scoreLoading, error: scoreError } = useUseCaseScore(useCase.id)
  const { isGenerating, error: pdfError, successMessage: pdfSuccessMessage, generatePDF } =
    usePDFExport(useCaseId)
  const pdfBlocked =
    useCase.status?.toLowerCase() !== 'completed' || classificationForNextSteps === 'impossible'
  const pdfButtonTitle =
    useCase.status?.toLowerCase() !== 'completed'
      ? 'Le cas d\'usage doit être complété pour générer le PDF'
      : classificationForNextSteps === 'impossible'
        ? 'Export PDF indisponible : classification réglementaire impossible (pivots non tranchés).'
        : 'Télécharger le rapport PDF'
  const { statuses: documentStatuses } = useDocumentStatuses(useCase.id)
  const { maydaiAsRegistry } = useCompanyInfo(useCase.company_id)

  const isUnacceptableCase =
    classificationStatus !== 'impossible' && riskLevel === 'unacceptable'

  const activeQuestionCodes = Array.isArray(useCase.active_question_codes)
    ? useCase.active_question_codes.filter((c): c is string => typeof c === 'string')
    : []

  const { slotStatuses } = useQuestionnaireSlotStatuses(
    useCaseId,
    Boolean(useCase.id && nextSteps && !isUnacceptableCase),
    {
      questionnaireVersion: useCase.questionnaire_version,
      activeQuestionCodes,
    }
  )

  const unacceptableInterdit = useUnacceptableInterdit1Source({
    useCaseId: useCase.id,
    authToken: session?.access_token,
    enabled: isUnacceptableCase && !!useCase.id && !!session?.access_token,
  })

  const recommendationsPhase = getNextStepsRecommendationsPhase({
    loading: nextStepsLoading,
    hasNextSteps: Boolean(nextSteps),
    useCaseStatus: useCase.status,
    classificationStatus: classificationForNextSteps,
    reportGeneratedAt: useCase.report_generated_at ?? null,
    parentReportGenerating: false,
    nextStepsError,
    nextStepsSyncStalled,
  })

  const reportGeneratedLabelAt =
    nextSteps?.generated_at ?? useCase.report_generated_at ?? null

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
                disabled={isGenerating || pdfBlocked}
                title={pdfButtonTitle}
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Génération PDF…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {pdfBlocked && classificationForNextSteps === 'impossible'
                      ? 'PDF indisponible'
                      : 'Télécharger PDF'}
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

          {pdfSuccessMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-900">{pdfSuccessMessage}</p>
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
              Une partie des conclusions de cette évaluation est basée sur les tests effectués par l'équipe MaydAI sur les principaux LLM dont <strong className="text-[#0080a3]">{useCase.compl_ai_models?.model_name || useCase.llm_model_version || '[Nom du modèle utilisé]'}</strong>. Si certaines lacunes en matière de robustesse, de sécurité, de diversité et d'équité peuvent être relevées, d'autres informations demandées par l'AI Act ne sont pas encore disponibles (ou transmises par les technologies concernées).
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
            {classificationStatus === 'impossible' && (
              <p className="text-sm text-violet-900 bg-violet-50 border border-violet-200 rounded-lg p-3 mb-6 leading-relaxed">
                La qualification du <strong>niveau IA Act</strong> est impossible tant que des pivots juridiques restent
                sans réponse exploitable. Le <strong>score de conformité</strong> ci-dessous reflète la maturité /
                conformité opérationnelle et ne constitue pas une qualification réglementaire.
              </p>
            )}
            
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
                ) : riskError ? (
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
                ) : classificationStatus === 'impossible' ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-violet-500 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="rounded-xl p-4 border shadow-sm border-violet-200 bg-violet-50">
                      <div className="text-center relative">
                        <HelpCircle className="h-8 w-8 text-violet-600 mx-auto mb-2" />
                        <div className="text-xl font-bold text-violet-900 mb-1">
                          Classification impossible
                        </div>
                        <div className="text-xs text-violet-800 leading-relaxed px-1">
                          Des réponses « Je ne sais pas » sur des pivots juridiques empêchent de conclure à un
                          niveau de risque. La génération de rapport PDF est bloquée jusqu&apos;à clarification.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !riskLevel ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                      <div className="text-lg font-bold text-gray-700 mb-1">Non évalué</div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        Niveau IA Act non qualifié ou données insuffisantes.
                      </div>
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
                          {riskLevel === 'unacceptable' ? 'Risque inacceptable' :
                           riskLevel === 'high' ? 'Risque élevé' :
                           riskLevel === 'limited' ? 'Risque limité' :
                           'Risque minimal'}
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
            {classificationStatus === 'impossible' && score && !scoreLoading && !scoreError && (
              <div className="mt-4 p-3 rounded-lg border border-violet-200 bg-violet-50 text-sm text-violet-900 leading-relaxed">
                {V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER}
              </div>
            )}
            
            {/* Justification du niveau de risque */}
            {classificationStatus === 'impossible' ? (
              <div className="mt-6 p-4 bg-violet-50 rounded-lg border border-violet-200">
                <h4 className="text-sm font-semibold text-violet-950 mb-3">Qualification réglementaire</h4>
                <div className="text-sm text-violet-900 leading-relaxed">
                  <p>
                    Aucun niveau IA Act n&apos;est attribué tant que les pivots concernés ne sont pas tranchés
                    (réponses autre que « Je ne sais pas »). Cela évite une présentation trompeuse en « risque
                    minimal » ou autre niveau par défaut.
                  </p>
                </div>
              </div>
            ) : (
              riskLevel && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Justification du niveau de risque</h4>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <p>{getRiskLevelJustification(riskLevel)}</p>
                  </div>
                </div>
              )
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
          
          {reportGeneratedLabelAt && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Rapport généré le{' '}
                      {new Date(reportGeneratedLabelAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
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

          {recommendationsPhase === 'initial_fetch' && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Chargement des recommandations…</p>
            </div>
          )}

          {recommendationsPhase === 'finalizing_recommendations' && (
            <div className="text-center py-8 border border-amber-100 bg-amber-50/60 rounded-lg mb-6">
              <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-800 text-sm font-medium mb-1">Finalisation des recommandations…</p>
              <p className="text-gray-600 text-sm max-w-md mx-auto px-4">
                Le rapport est enregistré ; les sections structurées se synchronisent.
              </p>
            </div>
          )}

          {recommendationsPhase === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Échec de la synchronisation</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {nextStepsError ||
                        "Les sections structurées (plan d'action) n'ont pas pu être chargées. Veuillez rafraîchir la page."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void refetchNextSteps()
                    window.location.reload()
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-800 bg-white border border-red-200 rounded-lg hover:bg-red-100/80 transition-colors shrink-0"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden />
                  Rafraîchir
                </button>
              </div>
            </div>
          )}

          {recommendationsPhase === 'empty_not_generated' && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Recommandations non disponibles</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Aucun rapport d&apos;analyse n&apos;a encore été généré pour ce cas, ou les extraits structurés ne sont
                pas encore présents. Un administrateur peut lancer la génération depuis la vue d&apos;ensemble du cas
                d&apos;usage.
              </p>
            </div>
          )}

          {recommendationsPhase === 'empty_impossible' && (
            <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <h3 className="text-sm font-semibold text-violet-950 mb-2">Recommandations réglementaires indisponibles</h3>
              <p className="text-sm text-violet-900 leading-relaxed">
                Tant que la qualification du niveau IA Act reste impossible, le rapport d&apos;analyse réglementaire
                complet et l&apos;export PDF ne sont pas proposés. Complétez les pivots du questionnaire pour débloquer
                ces contenus.
              </p>
            </div>
          )}

          {nextStepsError && recommendationsPhase !== 'error' && (
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

          {isUnacceptableCase && (
            <UnacceptableInterditsPanel
              useCaseId={useCaseId}
              companyId={useCase.company_id}
              deploymentDateIso={useCase.deployment_date ?? null}
              interdit1Text={unacceptableInterdit.interdit1Text}
              interdit1Loading={unacceptableInterdit.loading}
              interdit1Error={unacceptableInterdit.error}
            />
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

              {/* Évaluation du niveau de risque (standard) / Justification juridique (cas inacceptable) */}
              {nextSteps.evaluation && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/low-performance.png" 
                      alt={
                        isUnacceptableCase
                          ? 'Justification juridique du classement'
                          : 'Évaluation du risque'
                      }
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">
                      {isUnacceptableCase
                        ? 'Justification juridique du classement'
                        : 'Évaluation du niveau de risque AI Act'}
                    </h3>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                      {nextSteps.evaluation}
                    </p>
                  </div>
                </div>
              )}

              {!isUnacceptableCase &&
                !riskLoading &&
                !riskError &&
                classificationStatus === 'qualified' &&
                useCase?.company_id && (
                <ReportStandardPlanBlocks
                  nextSteps={nextSteps}
                  slotStatuses={slotStatuses}
                  documentStatuses={documentStatuses}
                  maydaiAsRegistry={maydaiAsRegistry}
                  companyId={useCase.company_id}
                  useCaseId={useCaseId}
                  riskLevel={riskLevel}
                  classificationStatus={classificationStatus}
                />
              )}

              {/* Impact attendu — non affiché pour risque inacceptable (hors plan d'action 9 slots) */}
              {!isUnacceptableCase && nextSteps.impact && (
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
  )
}


export default function UseCaseRapportPage() {
  const { user, loading, session } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { goToEvaluation, goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

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

  return (
    <UseCaseLayout useCase={useCase}>
      <UseCaseRapportMainContent
        useCase={useCase}
        useCaseId={useCaseId}
        profile={profile}
        profileLoading={profileLoading}
        session={session}
      />
    </UseCaseLayout>
  )
}