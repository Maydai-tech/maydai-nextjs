/**
 * @jest-environment jsdom
 */
const mockVerifyOtp = jest.fn()
const mockGetSession = jest.fn()
const mockExchange = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchange(...args),
    },
  },
}))

import { establishSessionFromUrl, isAuthRateLimited } from '../auth-email-links'

const session = { access_token: 't', user: { id: 'u1', email: 'a@b.fr' } }

function setUrl(path: string) {
  window.history.replaceState(null, '', path)
}

describe('establishSessionFromUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: null } })
  })

  test('token_hash + type → verifyOtp, puis nettoie l’URL', async () => {
    setUrl('/login/nouveau-mot-de-passe?token_hash=abc&type=recovery')
    mockVerifyOtp.mockResolvedValue({ data: { session }, error: null })

    const result = await establishSessionFromUrl()

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' })
    expect(result.session).toBe(session)
    expect(window.location.search).toBe('')
  })

  test('code déjà échangé automatiquement par supabase-js → pas de double échange', async () => {
    setUrl('/signup/confirmation?code=xyz')
    mockGetSession.mockResolvedValue({ data: { session } })

    const result = await establishSessionFromUrl()

    expect(mockExchange).not.toHaveBeenCalled()
    expect(result.session).toBe(session)
  })

  test('code sans session → exchangeCodeForSession', async () => {
    setUrl('/signup/confirmation?code=xyz')
    mockExchange.mockResolvedValue({ data: { session }, error: null })

    const result = await establishSessionFromUrl()

    expect(mockExchange).toHaveBeenCalledWith('xyz')
    expect(result.session).toBe(session)
  })

  test('code ouvert sur un autre navigateur → erreur', async () => {
    setUrl('/signup/confirmation?code=xyz')
    mockExchange.mockResolvedValue({ data: { session: null }, error: { message: 'code verifier not found' } })

    const result = await establishSessionFromUrl()

    expect(result.session).toBeNull()
    expect(result.error).toBe('code verifier not found')
  })

  test('lien expiré (erreur dans le hash) → erreur explicite', async () => {
    setUrl('/login/nouveau-mot-de-passe#error=access_denied&error_description=Email+link+is+invalid+or+has+expired')

    const result = await establishSessionFromUrl()

    expect(result.session).toBeNull()
    expect(result.error).toBe('Email link is invalid or has expired')
  })
})

describe('isAuthRateLimited', () => {
  test('détecte 429 et les codes de quota', () => {
    expect(isAuthRateLimited({ status: 429 })).toBe(true)
    expect(isAuthRateLimited({ code: 'over_email_send_rate_limit' })).toBe(true)
    expect(isAuthRateLimited({ code: 'invalid_credentials', status: 400 })).toBe(false)
    expect(isAuthRateLimited(null)).toBe(false)
  })
})
