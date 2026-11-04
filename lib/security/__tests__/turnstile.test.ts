import { verifyTurnstileToken } from '@/lib/security/turnstile'

describe('Security — verifyTurnstileToken', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv, TURNSTILE_SECRET_KEY: 'test-secret-key' }
  })

  afterAll(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('échoue si TURNSTILE_SECRET_KEY est absent de process.env', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await verifyTurnstileToken('some-token')
    expect(res).toEqual({
      success: false,
      errorCodes: ['missing-input-secret'],
    })
    expect(spyError).toHaveBeenCalled()
    spyError.mockRestore()
  })

  it('échoue sans appeler fetch si le token client est vide', async () => {
    const mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    const res = await verifyTurnstileToken('   ')
    expect(res).toEqual({
      success: false,
      errorCodes: ['missing-input-response'],
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('appelle Cloudflare siteverify en POST avec cache: no-store et retourne success: true', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, hostname: 'maydai.io' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const res = await verifyTurnstileToken('valid-client-token', '203.0.113.5')

    expect(res).toEqual({ success: true, errorCodes: undefined })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    )

    const callBody = mockFetch.mock.calls[0][1].body as string
    expect(callBody).toContain('secret=test-secret-key')
    expect(callBody).toContain('response=valid-client-token')
    expect(callBody).toContain('remoteip=203.0.113.5')
  })

  it('retourne success: false et logue un warning si Cloudflare rejette le token', async () => {
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const res = await verifyTurnstileToken('forged-bot-token')
    expect(res).toEqual({
      success: false,
      errorCodes: ['invalid-input-response'],
    })
    expect(spyWarn).toHaveBeenCalled()
    spyWarn.mockRestore()
  })
})
