import {
  completionSecondsFromTimestamps,
  meanSeconds,
  medianSeconds,
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
})
