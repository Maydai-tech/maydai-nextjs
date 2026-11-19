import {
  completionSecondsFromTimestamps,
  meanSeconds,
  medianSeconds,
  summarizeEvaluationPathRuns,
} from '@/lib/evaluation-path-runs-stats'

describe('evaluation-path-runs-stats', () => {
  test('medianSeconds', () => {
    expect(medianSeconds([])).toBeNull()
    expect(medianSeconds([10])).toBe(10)
    expect(medianSeconds([10, 20])).toBe(15)
    expect(medianSeconds([1, 2, 9])).toBe(2)
  })

  test('meanSeconds', () => {
    expect(meanSeconds([])).toBeNull()
    expect(meanSeconds([10, 20])).toBe(15)
  })

  test('completionSecondsFromTimestamps', () => {
    expect(
      completionSecondsFromTimestamps(
        '2026-01-01T12:00:00.000Z',
        '2026-01-01T12:00:45.000Z'
      )
    ).toBe(45)
    expect(
      completionSecondsFromTimestamps(
        '2026-01-01T12:00:00.000Z',
        '2026-01-01T11:00:00.000Z'
      )
    ).toBe(0)
  })

  test('summarizeEvaluationPathRuns isole le parcours assistant', () => {
    const started = [
      { path_mode: 'short' },
      { path_mode: 'long' },
      { path_mode: 'assistant' },
      { path_mode: 'assistant' },
    ]
    const completed = [
      { path_mode: 'long', completion_seconds: 100 },
      { path_mode: 'assistant', completion_seconds: 40 },
      { path_mode: 'assistant', completion_seconds: 60 },
    ]
    expect(summarizeEvaluationPathRuns(started, completed, 'assistant')).toEqual({
      starts: 2,
      completions: 2,
      completion_rate: 1,
      mean_completion_seconds: 50,
      median_completion_seconds: 50,
    })
    expect(summarizeEvaluationPathRuns(started, completed, 'short').starts).toBe(1)
    expect(summarizeEvaluationPathRuns(started, completed, 'short').completions).toBe(0)
  })
})
