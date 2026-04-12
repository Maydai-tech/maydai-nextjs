import {
  outcomesForShortCohort,
  pickFirstLongRunAfterShort,
  secondsBetween,
  summarizeConversion,
  summarizeConversionWindows,
  SECONDS_7D,
  type LongRunForLinkage,
  type ShortCohortRun,
} from '@/lib/evaluation-path-short-to-long'

const shortBase: ShortCohortRun = {
  id: 's1',
  usecase_id: 'uc-1',
  company_id: 'co-1',
  questionnaire_version: 3,
  entry_surface: 'hero',
  system_type: 'Produit',
  completed_at: '2026-01-10T12:00:00.000Z',
  classification_status: 'qualified',
  risk_level: 'limited',
}

describe('evaluation-path-short-to-long', () => {
  test('secondsBetween', () => {
    expect(
      secondsBetween('2026-01-10T12:00:00.000Z', '2026-01-10T12:05:00.000Z')
    ).toBe(300)
    expect(secondsBetween('2026-01-10T12:00:00.000Z', '2026-01-10T11:00:00.000Z')).toBeNull()
  })

  test('pickFirstLongRunAfterShort prend le plus tôt started_at >= fin court', () => {
    const longs: LongRunForLinkage[] = [
      {
        id: 'Llate',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: '2026-01-10T14:00:00.000Z',
        completed_at: null,
      },
      {
        id: 'Learly',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: '2026-01-10T12:30:00.000Z',
        completed_at: '2026-01-10T13:00:00.000Z',
      },
      {
        id: 'Lbefore',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: '2026-01-10T11:00:00.000Z',
        completed_at: null,
      },
    ]
    const map = new Map<string, LongRunForLinkage[]>([['uc-1', longs]])
    const first = pickFirstLongRunAfterShort(shortBase, map, 3)
    expect(first?.id).toBe('Learly')
  })

  test('filtre version exclut les longs d’une autre version', () => {
    const longs: LongRunForLinkage[] = [
      {
        id: 'Lv2',
        usecase_id: 'uc-1',
        questionnaire_version: 2,
        started_at: '2026-01-10T12:10:00.000Z',
        completed_at: null,
      },
    ]
    const map = new Map<string, LongRunForLinkage[]>([['uc-1', longs]])
    expect(pickFirstLongRunAfterShort(shortBase, map, 3)).toBeNull()
    expect(pickFirstLongRunAfterShort(shortBase, map, null)?.id).toBe('Lv2')
  })

  test('court sans long ne convertit pas', () => {
    const outcomes = outcomesForShortCohort([shortBase], [], 3)
    const s = summarizeConversion(outcomes)
    expect(s.cohort_short_completed_count).toBe(1)
    expect(s.with_long_started_after).toBe(0)
    expect(s.with_long_completed_after).toBe(0)
    expect(s.rate_short_completed_to_long_started).toBe(0)
  })

  test('court suivi d’un long démarré puis terminé', () => {
    const longs: LongRunForLinkage[] = [
      {
        id: 'L1',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: '2026-01-10T12:01:00.000Z',
        completed_at: '2026-01-10T15:00:00.000Z',
      },
    ]
    const outcomes = outcomesForShortCohort([shortBase], longs, 3)
    const s = summarizeConversion(outcomes)
    expect(s.with_long_started_after).toBe(1)
    expect(s.with_long_completed_after).toBe(1)
    expect(s.median_seconds_short_end_to_long_start).toBe(60)
    expect(s.median_seconds_short_end_to_long_end).toBe(60 * 60 * 3)
  })

  test('fenêtres 7j / 30j — démarrage long dans la fenêtre', () => {
    const longs: LongRunForLinkage[] = [
      {
        id: 'L1',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: '2026-01-10T12:01:00.000Z',
        completed_at: '2026-01-10T13:00:00.000Z',
      },
    ]
    const outcomes = outcomesForShortCohort([shortBase], longs, 3)
    const w = summarizeConversionWindows(outcomes)
    expect(w.long_started_within_7d).toBe(1)
    expect(w.long_started_within_30d).toBe(1)
    expect(w.long_completed_within_7d).toBe(1)
    expect(w.rate_cohort_long_started_within_7d).toBe(1)
  })

  test('fenêtre 7j — long démarré juste après 7 jours est exclu', () => {
    const shortMs = new Date('2026-01-10T12:00:00.000Z').getTime()
    const startLongMs = shortMs + SECONDS_7D * 1000 + 60 * 1000
    const longs: LongRunForLinkage[] = [
      {
        id: 'Llate',
        usecase_id: 'uc-1',
        questionnaire_version: 3,
        started_at: new Date(startLongMs).toISOString(),
        completed_at: null,
      },
    ]
    const outcomes = outcomesForShortCohort([shortBase], longs, 3)
    const w = summarizeConversionWindows(outcomes)
    expect(w.long_started_within_7d).toBe(0)
    expect(w.long_started_within_30d).toBe(1)
  })
})
