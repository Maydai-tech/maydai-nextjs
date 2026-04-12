import { sendGTMEvent } from '@/lib/gtm'
import {
  trackV3ShortPathCta,
  trackV3ShortPathOutcomeResult,
  trackV3ShortPathOutcomeView,
  trackV3ShortPathSegmentView,
  trackV3ShortPathSessionStart,
  trackV3EvaluationEntrySurface,
  v3ShortPathSystemTypeBucket,
} from '@/lib/v3-short-path-analytics'

jest.mock('@/lib/gtm', () => ({
  sendGTMEvent: jest.fn(),
}))

describe('v3-short-path-analytics', () => {
  beforeEach(() => {
    jest.mocked(sendGTMEvent).mockClear()
  })

  it('v3ShortPathSystemTypeBucket agrège Produit', () => {
    expect(v3ShortPathSystemTypeBucket('Produit')).toBe('produit')
    expect(v3ShortPathSystemTypeBucket('  ')).toBe('unknown')
    expect(v3ShortPathSystemTypeBucket('Service')).toBe('autre')
  })

  it('trackV3ShortPathSessionStart pousse un événement structuré', () => {
    trackV3ShortPathSessionStart({
      usecase_id: 'uc-1',
      system_type_bucket: 'produit',
      page_path: '/usecases/x/evaluation?parcours=court',
    })
    expect(sendGTMEvent).toHaveBeenCalledTimes(1)
    expect(sendGTMEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_start',
        questionnaire_version: 3,
        usecase_id: 'uc-1',
        system_type_bucket: 'produit',
        page_path: '/usecases/x/evaluation?parcours=court',
      })
    )
  })

  it('trackV3ShortPathSegmentView inclut segment et question', () => {
    trackV3ShortPathSegmentView({
      usecase_id: 'uc-1',
      segment_order: 3,
      segment_key: 'domains',
      question_id: 'E4.N7.Q4',
    })
    expect(sendGTMEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_segment',
        segment_order: 3,
        segment_key: 'domains',
        question_id: 'E4.N7.Q4',
      })
    )
  })

  it('trackV3ShortPathOutcomeView et OutcomeResult', () => {
    trackV3ShortPathOutcomeView({ usecase_id: 'uc-1' })
    expect(sendGTMEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: 'v3_short_path_outcome_view' })
    )
    trackV3ShortPathOutcomeResult({
      usecase_id: 'uc-1',
      system_type_bucket: 'autre',
      classification_status: 'impossible',
      risk_level: null,
    })
    expect(sendGTMEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_outcome_result',
        classification_status: 'impossible',
        risk_level: null,
      })
    )
  })

  it('trackV3ShortPathCta inclut le type de CTA', () => {
    trackV3ShortPathCta({
      usecase_id: 'uc-1',
      system_type_bucket: 'produit',
      cta: 'copy_summary',
      classification_status: 'qualified',
      risk_level: 'limited',
    })
    expect(sendGTMEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_cta',
        cta: 'copy_summary',
        classification_status: 'qualified',
        risk_level: 'limited',
      })
    )
  })

  it('trackV3ShortPathCta peut inclure cta_placement pour la conversion court → long', () => {
    trackV3ShortPathCta({
      usecase_id: 'uc-1',
      system_type_bucket: 'produit',
      cta: 'evaluation_long',
      cta_placement: 'outcome_hero',
    })
    expect(sendGTMEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_cta',
        cta: 'evaluation_long',
        cta_placement: 'outcome_hero',
      })
    )
  })

  it('trackV3ShortPathSessionStart peut inclure entry_surface', () => {
    trackV3ShortPathSessionStart({
      usecase_id: 'uc-1',
      system_type_bucket: 'produit',
      entry_surface: 'dashboard_card',
    })
    expect(sendGTMEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'v3_short_path_start',
        entry_surface: 'dashboard_card',
      })
    )
  })

  it('trackV3EvaluationEntrySurface pousse un événement pour le long avec entree', () => {
    trackV3EvaluationEntrySurface({
      usecase_id: 'uc-1',
      questionnaire_version: 3,
      entry_surface: 'dossier_detail_long',
      system_type_bucket: 'autre',
    })
    expect(sendGTMEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'v3_evaluation_entry_surface',
        path_mode: 'long',
        entry_surface: 'dossier_detail_long',
        questionnaire_version: 3,
      })
    )
  })
})
