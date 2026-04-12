import { evaluationPathRunsAdminToCsv } from '@/lib/evaluation-path-runs-admin-csv'

describe('evaluation-path-runs-admin-csv', () => {
  test('inclut BOM et sections meta', () => {
    const csv = evaluationPathRunsAdminToCsv({
      meta: {
        from: '2026-01-01',
        to: '2026-01-31',
        start_utc: 'x',
        end_utc: 'y',
        questionnaire_version: 3,
      },
      short: { starts: 1, completions: 0, completion_rate: 0, mean_completion_seconds: null, median_completion_seconds: null },
      long: { starts: 2, completions: 1, completion_rate: 0.5, mean_completion_seconds: 10, median_completion_seconds: 10 },
      short_to_long: {
        summary: {
          cohort_short_completed_count: 1,
          with_long_started_after: 0,
          with_long_completed_after: 0,
          rate_short_completed_to_long_started: 0,
          rate_short_completed_to_long_completed: 0,
          median_seconds_short_end_to_long_start: null,
          mean_seconds_short_end_to_long_start: null,
          median_seconds_short_end_to_long_end: null,
          mean_seconds_short_end_to_long_end: null,
        },
        summary_windows: {
          cohort_short_completed_count: 1,
          long_started_within_7d: 0,
          long_started_within_30d: 0,
          rate_cohort_long_started_within_7d: 0,
          rate_cohort_long_started_within_30d: 0,
          long_completed_within_7d: 0,
          long_completed_within_30d: 0,
          rate_cohort_long_completed_within_7d: 0,
          rate_cohort_long_completed_within_30d: 0,
        },
        by_entry_surface: [],
        by_system_type: [],
        by_classification_status: [],
        by_risk_level: [],
        by_questionnaire_version: [],
        by_company_id: [
          {
            segment: 'uuid-co',
            company_name: 'Acme',
            cohort_count: 2,
            long_started: 1,
            long_completed: 0,
            rate_started: 0.5,
            rate_completed: 0,
            median_seconds_to_long_start: 100,
          },
        ],
      },
      by_entry_surface: [],
      by_outcome: [],
    })
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('evaluation_path_runs')
    expect(csv).toContain('Acme')
    expect(csv).toContain('uuid-co')
  })
})
