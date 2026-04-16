import {
  shouldPollForNextSteps,
  getNextStepsRecommendationsPhase,
  canRequestAiReportGeneration,
} from '../nextsteps-ux-state'

describe('nextsteps-ux-state', () => {
  describe('shouldPollForNextSteps', () => {
    test('ne poll pas sans nextsteps si cas non complété', () => {
      expect(
        shouldPollForNextSteps({
          useCaseStatus: 'draft',
          classificationStatus: 'qualified',
          reportGeneratedAt: null,
          parentReportGenerating: false,
          hasNextSteps: false,
        })
      ).toBe(false)
    })

    test('ne poll pas si complété mais aucun rapport persisté et pas de génération parent', () => {
      expect(
        shouldPollForNextSteps({
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: null,
          parentReportGenerating: false,
          hasNextSteps: false,
        })
      ).toBe(false)
    })

    test('ne poll pas si classification impossible', () => {
      expect(
        shouldPollForNextSteps({
          useCaseStatus: 'completed',
          classificationStatus: 'impossible',
          reportGeneratedAt: '2025-01-01',
          parentReportGenerating: false,
          hasNextSteps: false,
        })
      ).toBe(false)
    })

    test('poll si rapport déjà persisté mais nextsteps pas encore là', () => {
      expect(
        shouldPollForNextSteps({
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: '2025-01-01T00:00:00Z',
          parentReportGenerating: false,
          hasNextSteps: false,
        })
      ).toBe(true)
    })

    test('poll pendant génération rapport côté parent', () => {
      expect(
        shouldPollForNextSteps({
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: null,
          parentReportGenerating: true,
          hasNextSteps: false,
        })
      ).toBe(true)
    })
  })

  describe('getNextStepsRecommendationsPhase', () => {
    test('complété sans rapport ni nextsteps : empty_not_generated', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: null,
          parentReportGenerating: false,
        })
      ).toBe('empty_not_generated')
    })

    test('rapport persisté sans nextsteps : finalizing', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: '2025-01-01',
          parentReportGenerating: false,
        })
      ).toBe('finalizing_recommendations')
    })

    test('impossible sans nextsteps : empty_impossible', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'impossible',
          reportGeneratedAt: null,
          parentReportGenerating: false,
        })
      ).toBe('empty_impossible')
    })

    test('impossible prime sur le chargement (pas de loader « rapport » trompeur)', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: true,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'impossible',
          reportGeneratedAt: null,
          parentReportGenerating: false,
        })
      ).toBe('empty_impossible')
    })

    test('erreur next steps : priorité sur finalizing_recommendations', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: '2025-01-01',
          parentReportGenerating: false,
          nextStepsError: 'Erreur réseau',
        })
      ).toBe('error')
    })

    test('sync bloquée : priorité sur finalizing_recommendations', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: '2025-01-01',
          parentReportGenerating: false,
          nextStepsSyncStalled: true,
        })
      ).toBe('error')
    })

    test('chaîne erreur vide : reste en finalizing', () => {
      expect(
        getNextStepsRecommendationsPhase({
          loading: false,
          hasNextSteps: false,
          useCaseStatus: 'completed',
          classificationStatus: 'qualified',
          reportGeneratedAt: '2025-01-01',
          parentReportGenerating: false,
          nextStepsError: '   ',
        })
      ).toBe('finalizing_recommendations')
    })
  })

  describe('canRequestAiReportGeneration', () => {
    test('complété qualified : oui', () => {
      expect(
        canRequestAiReportGeneration({
          classificationStatus: 'qualified',
          useCaseStatus: 'completed',
        })
      ).toBe(true)
    })

    test('impossible : non', () => {
      expect(
        canRequestAiReportGeneration({
          classificationStatus: 'impossible',
          useCaseStatus: 'completed',
        })
      ).toBe(false)
    })
  })
})
