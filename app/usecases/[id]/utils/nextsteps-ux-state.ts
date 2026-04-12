/**
 * États UX pour les recommandations (nextsteps) — logique pure, testable.
 * Ne déduit jamais une « génération en cours » depuis un simple absence de ligne en base.
 */

export type NextStepsRecommendationsPhase =
  | 'initial_fetch'
  | 'admin_generating_report'
  | 'finalizing_recommendations'
  | 'ready'
  | 'empty_not_generated'
  | 'empty_impossible'
  | 'error'

export function shouldPollForNextSteps(params: {
  useCaseStatus?: string
  classificationStatus?: string | null
  reportGeneratedAt?: string | null
  parentReportGenerating: boolean
  hasNextSteps: boolean
}): boolean {
  if (params.hasNextSteps) return false
  const completed = String(params.useCaseStatus || '').toLowerCase() === 'completed'
  if (!completed) return false
  if (params.classificationStatus === 'impossible') return false
  if (params.parentReportGenerating) return true
  if (params.reportGeneratedAt) return true
  return false
}

/**
 * Phase affichée pour la zone recommandations (hors erreur explicite du hook).
 */
export function getNextStepsRecommendationsPhase(params: {
  loading: boolean
  hasNextSteps: boolean
  useCaseStatus?: string
  classificationStatus?: string | null
  reportGeneratedAt?: string | null
  parentReportGenerating: boolean
}): NextStepsRecommendationsPhase {
  if (params.hasNextSteps) {
    return 'ready'
  }
  if (params.classificationStatus === 'impossible') {
    return 'empty_impossible'
  }
  if (params.parentReportGenerating) {
    return 'admin_generating_report'
  }
  if (params.loading) {
    return 'initial_fetch'
  }
  const completed = String(params.useCaseStatus || '').toLowerCase() === 'completed'
  if (completed && params.reportGeneratedAt) {
    return 'finalizing_recommendations'
  }
  return 'empty_not_generated'
}

export function canRequestAiReportGeneration(params: {
  isAdmin: boolean
  classificationStatus?: string | null
  useCaseStatus?: string
}): boolean {
  if (!params.isAdmin) return false
  if (params.classificationStatus === 'impossible') return false
  return String(params.useCaseStatus || '').toLowerCase() === 'completed'
}
