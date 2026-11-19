import { formatGo, usageBarClass, nextPurgeFr, parseUsePercent } from '../format'

describe('formatGo', () => {
  test('returns "0 Go" for 0 bytes', () => {
    expect(formatGo(0)).toBe('0 Go')
  })

  test('returns "0 Go" for less than 50 MB (rounding noise floor)', () => {
    expect(formatGo(40_000_000)).toBe('0 Go')
  })

  test('returns one decimal with comma for sub-GB just above the floor', () => {
    expect(formatGo(950_000_000)).toBe('0,9 Go')
  })

  test('returns one decimal with comma for typical sizes', () => {
    expect(formatGo(1_500_000_000)).toBe('1,5 Go')
    expect(formatGo(50_900_000_000)).toBe('50,9 Go')
  })

  test('keeps Go suffix even past 1 TB', () => {
    expect(formatGo(1_500_000_000_000)).toBe('1500,0 Go')
  })

  test('handles negative or NaN gracefully', () => {
    expect(formatGo(NaN)).toBe('0 Go')
    expect(formatGo(-100)).toBe('0 Go')
  })
})

describe('usageBarClass', () => {
  test('green below 70%', () => {
    expect(usageBarClass(0)).toBe('bg-emerald-500')
    expect(usageBarClass(69)).toBe('bg-emerald-500')
  })

  test('orange between 70% and 84%', () => {
    expect(usageBarClass(70)).toBe('bg-orange-500')
    expect(usageBarClass(84)).toBe('bg-orange-500')
  })

  test('red at or above 85%', () => {
    expect(usageBarClass(85)).toBe('bg-red-600')
    expect(usageBarClass(100)).toBe('bg-red-600')
  })
})

describe('parseUsePercent', () => {
  test('extracts integer from "82%" string', () => {
    expect(parseUsePercent('82%')).toBe(82)
  })

  test('extracts integer from "82" without percent', () => {
    expect(parseUsePercent('82')).toBe(82)
  })

  test('returns 0 on invalid input', () => {
    expect(parseUsePercent('')).toBe(0)
    expect(parseUsePercent('not a number')).toBe(0)
    expect(parseUsePercent(undefined)).toBe(0)
    expect(parseUsePercent(null)).toBe(0)
  })
})

describe('nextPurgeFr', () => {
  test('mid-week Monday returns next Sunday 05h00 (CEST in May)', () => {
    const now = new Date('2026-05-04T13:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 10 mai à 05h00')
  })

  test('Sunday before 03:00 UTC still returns same Sunday', () => {
    const now = new Date('2026-05-10T02:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 10 mai à 05h00')
  })

  test('Sunday at 03:00 UTC exactly returns NEXT Sunday', () => {
    const now = new Date('2026-05-10T03:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 17 mai à 05h00')
  })

  test('Sunday after 03:00 UTC returns NEXT Sunday', () => {
    const now = new Date('2026-05-10T03:01:00Z')
    expect(nextPurgeFr(now)).toBe('dim 17 mai à 05h00')
  })

  test('winter date returns 04h00 (CET, no DST)', () => {
    const now = new Date('2026-01-05T13:00:00Z')
    expect(nextPurgeFr(now)).toBe('dim 11 janv. à 04h00')
  })
})
