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
import { useUseCaseScore } from './hooks/useUseCaseScore'
import { useUseCaseRisk } from './context/UseCaseRiskContext'
import type { UseCase } from './types/usecase'
import { RefreshCcw } from 'lucide-react'
import { getScoreStyle } from '@/lib/score-styles'
import { RiskLevelBadge } from './components/overview/RiskLevelBadge'
import { V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER } from '@/lib/classification-risk-display'
import { getCompanyStatusLabel, getCompanyStatusDefinition } from './utils/company-status'
import UnacceptableInterditsPanel from '@/components/UnacceptableCase/UnacceptableInterditsPanel'
import { useUnacceptableInterdit1Source } from '@/hooks/useUnacceptableInterdit1Source'
import { useDocumentStatuses } from './hooks/useDocumentStatuses'
import { useCompanyInfo } from './hooks/useCompanyInfo'
import { useQuestionnaireSlotStatuses } from './hooks/useQuestionnaireSlotStatuses'
import { ReportStandardPlanBlocks } from './components/report/ReportStandardPlanBlocks'
import {
  getNextStepsRecommendationsPhase,
  canRequestAiReportGeneration,
} from './utils/nextsteps-ux-state'

interface UseCaseOverviewSectionsProps {
  useCase: UseCase
  useCaseId: string
  updateUseCase: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating: boolean
  isRecalculating: boolean
  session: { access_token?: string } | null
  generatingReport: boolean
  handleGenerateReport: () => void | Promise<void>
}

function UseCaseOverviewSections({
  useCase,
  useCaseId,
  updateUseCase,
  updating,
  isRecalculating,
  session,
  generatingReport,
  handleGenerateReport,
}: UseCaseOverviewSectionsProps) {
  const { riskLevel, classificationStatus, loading: riskLoading, error: riskError } = useUseCaseRisk()
  const classificationForNextSteps = classificationStatus ?? useCase.classification_status ?? null
  const { nextSteps, loading: nextStepsLoading, error: nextStepsError } = useNextSteps({
    usecaseId: useCase.id,
    useCaseStatus: useCase.status,
    useCaseUpdatedAt: useCase.updated_at,
    reportGeneratedAt: useCase.report_generated_at ?? null,
    parentReportGenerating: generatingReport,
    classificationStatus: classificationForNextSteps,
  })
  const isUnacceptableCase =
    classificationStatus !== 'impossible' && riskLevel === 'unacceptable'
  const { score, loading: scoreLoading, error: scoreError } = useUseCaseScore(useCase.id)
  const { statuses: documentStatuses } = useDocumentStatuses(useCase.id)
  const { maydaiAsRegistry } = useCompanyInfo(useCase.company_id)
  const activeQuestionCodes = Array.isArray(useCase.active_question_codes)
    ? useCase.active_question_codes.filter((c): c is string => typeof c === 'string')
    : []

  const { slotStatuses } = useQuestionnaireSlotStatuses(
    useCase.id,
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
    parentReportGenerating: generatingReport,
  })

  const canClickGenerateReport = canRequestAiReportGeneration({
    classificationStatus: classificationForNextSteps,
    useCaseStatus: useCase.status,
  })

  const generateReportDisabledTitle =
    classificationForNextSteps === 'impossible'
      ? 'Génération indisponible : qualification réglementaire impossible (pivots à trancher dans le questionnaire).'
      : String(useCase.status || '').toLowerCase() !== 'completed'
        ? "L'évaluation doit être terminée avant de pouvoir générer le plan d'action."
        : undefined

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <UseCaseDetails useCase={useCase} onUpdateUseCase={updateUseCase} updating={updating} />
        <UseCaseSidebar useCase={useCase} onUpdateUseCase={updateUseCase} isRecalculating={isRecalculating} />
      </div>

      <div className="space-y-6 sm:space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Rapport d&apos;Audit Préliminaire</h2>

          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Ce rapport réalisé par l&apos;entreprise{' '}
              <strong className="text-[#0080a3]">{useCase.companies?.name || "[Nom de l'entreprise]"}</strong> présente
              les conclusions d&apos;un audit préliminaire du système d&apos;IA{' '}
              <strong className="text-[#0080a3]">{useCase.name || '[Nom du système]'}</strong> au regard des exigences
              du règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 établissant des règles
              harmonisées concernant l&apos;intelligence artificielle « AI Act ».
            </p>

            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Statut de l&apos;entreprise :</strong>{' '}
              <span className="text-[#0080a3]">{getCompanyStatusLabel(useCase.company_status)}</span>
            </p>

            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border mb-4">
              <p className="font-medium text-gray-800 mb-2">Définition IA Act :</p>
              <p className="text-gray-700 leading-relaxed">{getCompanyStatusDefinition(useCase.company_status)}</p>
            </div>

            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Résumé du cas d&apos;usage :</strong>{' '}
              {useCase.description || "[Description du cas d'usage]"}
            </p>

            <p className="text-base leading-relaxed text-gray-800 mb-4">
              L&apos;objectif de cet audit préliminaire est d&apos;identifier les domaines de conformité actuels et les
              lacunes, afin de proposer des actions correctives immédiates (quick wins) et des plans d&apos;action à
              moyen et long terme, en soulignant les spécificités des grands modèles linguistiques (LLM) et de leur
              transparence.
            </p>

            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Une partie des conclusions de cette évaluation est basée sur les tests effectués par l&apos;équipe
              MaydAI sur les principaux LLM dont{' '}
              <strong className="text-[#0080a3]">
                {useCase.compl_ai_models?.model_name || useCase.llm_model_version || '[Nom du modèle utilisé]'}
              </strong>
              . Si certaines lacunes en matière de robustesse, de sécurité, de diversité et d&apos;équité peuvent être
              relevées, d&apos;autres informations demandées par l&apos;AI Act ne sont pas encore disponibles (ou
              transmises par les technologies concernées).
            </p>

            <p className="text-base leading-relaxed text-gray-800">
              Ce rapport vise à fournir une feuille de route aux entreprises pour naviguer dans ce paysage réglementaire
              complexe.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Classification du système d&apos;IA</h2>

          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              L&apos;AI Act adopte une approche fondée sur les risques, classifiant les systèmes d&apos;IA en différentes
              catégories selon leur niveau de risque. Cette classification détermine les obligations réglementaires
              applicables.
            </p>
            {classificationStatus === 'impossible' && (
              <p className="text-sm text-violet-900 bg-violet-50 border border-violet-200 rounded-lg p-3 mb-6 leading-relaxed">
                La qualification du <strong>niveau IA Act</strong> est impossible tant que des pivots juridiques restent
                sans réponse exploitable. Le <strong>score de conformité</strong> affiché à côté mesure la maturité /
                conformité opérationnelle et ne remplace pas cette qualification réglementaire.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                    Niveau IA Act
                  </h3>
                  <RiskLevelBadge
                    riskLevel={riskLevel}
                    classificationStatus={classificationStatus}
                    loading={riskLoading}
                    error={riskError}
                    className="w-full"
                  />
                </div>
              </div>

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
                      {score.score_scope === 'short_initial' ? 'Score initial (parcours court)' : 'Score de conformité'}
                    </h3>

                    <div
                      className={`${getScoreStyle(score.score).bg} rounded-xl p-4 border ${getScoreStyle(score.score).border} ${getScoreStyle(score.score).shadow} shadow-sm hover:shadow-md transition-all duration-200`}
                    >
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreStyle(score.score).text} mb-2`}>
                          {Math.round(score.score)}
                        </div>
                      </div>
                    </div>
                    {score.score_scope === 'short_initial' && score.score_display_hint ? (
                      <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">{score.score_display_hint}</p>
                    ) : null}
                    <a
                      href="#scores-description"
                      className="mt-3 block text-xs text-[#0080A3] hover:text-[#006280] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-1 rounded"
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById('scores-description')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      Comment est calculé ce score ?
                    </a>
                  </div>
                )}
              </div>
            </div>
            {classificationStatus === 'impossible' && score && !scoreLoading && !scoreError && (
              <div className="mt-4 p-3 rounded-lg border border-violet-200 bg-violet-50 text-sm text-violet-900 leading-relaxed">
                {V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Recommandations et plan d&apos;action</h2>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport || !canClickGenerateReport}
                title={
                  generatingReport
                    ? 'Génération du rapport en cours…'
                    : !canClickGenerateReport
                      ? generateReportDisabledTitle
                      : undefined
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#006280] rounded-lg hover:bg-[#004d63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {generatingReport ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4" />
                    Générer le plan d&apos;action (IA)
                  </>
                )}
              </button>
            </div>
          </div>

          {(nextSteps?.generated_at || useCase.report_generated_at) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Rapport généré le{' '}
                      {new Date(
                        nextSteps?.generated_at || useCase.report_generated_at || ''
                      ).toLocaleDateString('fr-FR', {
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
            <div className="text-center py-10">
              <div className="animate-spin h-10 w-10 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600 text-sm">Chargement des recommandations…</p>
            </div>
          )}

          {recommendationsPhase === 'admin_generating_report' && (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <div className="animate-spin h-12 w-12 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Génération du rapport d&apos;analyse en cours…</h3>
              <p className="text-gray-600 mb-4">
                L&apos;IA produit le rapport et extrait les blocs de recommandations. Cela peut prendre 30 à 90 secondes.
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-700">Ne fermez pas l&apos;onglet pendant l&apos;opération.</span>
              </div>
            </div>
          )}

          {recommendationsPhase === 'finalizing_recommendations' && (
            <div className="text-center py-10 border border-amber-100 bg-amber-50/60 rounded-lg mb-6">
              <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Finalisation des recommandations…</h3>
              <p className="text-gray-600 text-sm max-w-lg mx-auto px-4">
                Le rapport est enregistré ; les sections structurées (plan d&apos;action) se synchronisent. Patience
                quelques instants.
              </p>
            </div>
          )}

          {recommendationsPhase === 'empty_not_generated' && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Plan d&apos;action non généré</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Générez votre plan d&apos;action à partir des réponses enregistrées. Les points non couverts par le
                questionnaire restent évalués avec les règles « information insuffisante » / hors périmètre actif,
                comme pour tout cas complété.
              </p>
            </div>
          )}

          {recommendationsPhase === 'empty_impossible' && (
            <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <h3 className="text-sm font-semibold text-violet-950 mb-2">Recommandations réglementaires indisponibles</h3>
              <p className="text-sm text-violet-900 leading-relaxed">
                Tant que la <strong>qualification du niveau IA Act</strong> reste impossible (pivots non tranchés), MaydAI
                ne produit pas de rapport d&apos;analyse réglementaire complet ni d&apos;export PDF. Complétez ou précisez
                les réponses du questionnaire pour débloquer ces étapes.
              </p>
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
              {nextSteps.evaluation && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/icons/low-performance.png"
                      alt={
                        isUnacceptableCase ? 'Justification juridique du classement' : 'Évaluation du risque'
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
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">{nextSteps.evaluation}</p>
                  </div>
                </div>
              )}

              {!isUnacceptableCase &&
                !riskLoading &&
                !riskError &&
                classificationStatus === 'qualified' &&
                useCase.company_id && (
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

              {!isUnacceptableCase && nextSteps.impact && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img src="/icons/administrative-law.png" alt="Impact attendu" width={24} height={24} className="flex-shrink-0" />
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
  )
}

export default function UseCaseDetailPage() {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  // Récupération des données du use case avec état de recalcul
  const { useCase, progress, loading: loadingData, error, updateUseCase, updating, isRecalculating } = useUseCaseData(useCaseId)
  const { goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

  const [generatingReport, setGeneratingReport] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  const handleGenerateReport = async () => {
    if (!useCase || !session?.access_token) return

    setGeneratingReport(true)
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ usecase_id: useCase.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération du rapport')
      }

      // Recharger la page pour afficher le nouveau rapport
      window.location.reload()
    } catch (error) {
      console.error('Erreur génération rapport:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de la génération du rapport')
    } finally {
      setGeneratingReport(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d&apos;usage non trouvé</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès."}
          </p>
          <button
            onClick={goToCompanies}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Retour à l&apos;accueil
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
      <UseCaseOverviewSections
        useCase={useCase}
        useCaseId={useCaseId}
        updateUseCase={updateUseCase}
        updating={updating}
        isRecalculating={isRecalculating}
        session={session}
        generatingReport={generatingReport}
        handleGenerateReport={handleGenerateReport}
      />
    </UseCaseLayout>
  )
} 