import {
  bucketKeyForInstant,
  enumerateBucketKeys,
  formatBucketLabel,
  parisYmd,
} from '@/lib/admin-analytics-buckets'

describe('admin-analytics-buckets', () => {
  test('parisYmd reads calendar date in Europe/Paris', () => {
    const d = new Date('2025-07-15T22:00:00.000Z')
    expect(parisYmd(d)).toEqual({ y: 2025, m: 7, d: 16 })
  })

  test('bucketKeyForInstant day uses Paris date', () => {
    const d = new Date('2025-07-15T22:00:00.000Z')
    expect(bucketKeyForInstant(d, 'day')).toBe('2025-07-16')
  })

  test('bucketKeyForInstant month', () => {
    const d = new Date('2025-07-15T12:00:00.000Z')
    expect(bucketKeyForInstant(d, 'month')).toBe('2025-07')
  })

  test('bucketKeyForInstant quarter', () => {
    const d = new Date('2025-02-10T12:00:00.000Z')
    expect(bucketKeyForInstant(d, 'quarter')).toBe('2025-Q1')
  })

  test('enumerateBucketKeys covers range with week buckets', () => {
    const keys = enumerateBucketKeys('2025-01-06', '2025-01-12', 'week')
    expect(keys.length).toBeGreaterThanOrEqual(1)
    expect(keys[0]).toMatch(/^\d{4}-W\d{2}$/)
  })

  test('formatBucketLabel quarter', () => {
    expect(formatBucketLabel('2025-Q3', 'quarter')).toBe('T3 2025')
  })
})
