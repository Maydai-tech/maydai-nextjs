import { clientIp, isRateLimited } from '../rate-limit'

describe('isRateLimited', () => {
  test('laisse passer jusqu’à la limite, bloque ensuite, puis repart après la fenêtre', () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 3; i += 1) expect(isRateLimited(key, 3, 1000, 0)).toBe(false)
    expect(isRateLimited(key, 3, 1000, 500)).toBe(true)
    expect(isRateLimited(key, 3, 1000, 1000)).toBe(false)
  })

  test('compte chaque clé séparément', () => {
    const a = `a-${Math.random()}`
    expect(isRateLimited(a, 1, 1000, 0)).toBe(false)
    expect(isRateLimited(a, 1, 1000, 1)).toBe(true)
    expect(isRateLimited(`b-${Math.random()}`, 1, 1000, 1)).toBe(false)
  })
})

describe('clientIp', () => {
  test('prend la première adresse transmise par le proxy', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.8' }))).toBe('203.0.113.8')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
