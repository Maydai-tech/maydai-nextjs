const mockUpdateUser = jest.fn()
const mockSendSignUpEvent = jest.fn()
const mockSendConversion = jest.fn()
const mockClearStoredAttribution = jest.fn()
const mockReadStoredAttribution = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args) } },
}))
jest.mock('@/lib/gtm', () => ({
  sendSignUpEvent: (...args: unknown[]) => mockSendSignUpEvent(...args),
  sendGoogleAdsSignupConversionWithUserData: (...args: unknown[]) => mockSendConversion(...args),
}))
jest.mock('@/lib/utils/crypto', () => ({ hashEmailForGoogleAds: async () => 'hashed' }))
jest.mock('@/lib/tracking/capture-params', () => ({
  readStoredAttribution: () => mockReadStoredAttribution(),
  hasMeaningfulAttribution: (a: { utm_source?: string | null; gclid?: string | null } | null) =>
    Boolean(a && (a.utm_source || a.gclid)),
  clearStoredAttribution: () => mockClearStoredAttribution(),
}))

import type { Session } from '@supabase/supabase-js'
import {
  acquisitionFields,
  computeEffectiveAttribution,
  finalizePendingSignup,
  getPendingSignup,
  PENDING_SIGNUP_KEY,
  type PendingSignup,
} from '../signup-finalize'

const attribution = {
  click_id: null,
  gclid: null,
  utm_source: 'learning-gate',
  utm_medium: 'partner',
  utm_campaign: null,
  captured_at: '2026-01-01T00:00:00.000Z',
}

function sessionWith(pending: PendingSignup | null): Session {
  return {
    access_token: 'jwt',
    user: { id: 'u1', email: 'jean@ex.fr', user_metadata: pending ? { [PENDING_SIGNUP_KEY]: pending } : {} },
  } as unknown as Session
}

const pending: PendingSignup = {
  profile: {
    firstName: 'Jean',
    lastName: 'Dupont',
    companyName: 'ACME',
    mainIndustryId: 'tech',
    subCategoryId: 'saas',
    utm_source: 'learning-gate',
  },
  leadId: null,
  attribution,
}

describe('signup-finalize', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    global.fetch = fetchMock as unknown as typeof fetch
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' })
    mockUpdateUser.mockResolvedValue({ error: null })
  })

  afterEach(() => jest.useRealTimers())

  async function run(session: Session) {
    const promise = finalizePendingSignup(session)
    await jest.runAllTimersAsync()
    return promise
  }

  test('ne fait rien sans inscription en attente', async () => {
    expect(await run(sessionWith(null))).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('appelle complete-signup avec le profil stocké, crée le lead, efface les métadonnées', async () => {
    expect(await run(sessionWith(pending))).toBe(true)

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/complete-signup', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(pending.profile),
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/leads/website-direct', expect.anything())
    expect(mockClearStoredAttribution).toHaveBeenCalled()
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { [PENDING_SIGNUP_KEY]: null } })
    expect(mockSendSignUpEvent).toHaveBeenCalledWith('formulaire_landing', { userId: 'u1' })
  })

  test('lie le lead d’invitation plutôt que website-direct', async () => {
    await run(sessionWith({ ...pending, leadId: 'lead-1' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/leads/link-to-user', expect.objectContaining({
      body: JSON.stringify({ leadId: 'lead-1' }),
    }))
  })

  test('erreur complete-signup → lève et garde les données en attente', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Payload invalide' }) })
    await expect(finalizePendingSignup(sessionWith(pending))).rejects.toThrow('Payload invalide')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  test('getPendingSignup ignore des métadonnées invalides', () => {
    expect(getPendingSignup(sessionWith(pending))).toEqual(pending)
    expect(getPendingSignup({ user: { user_metadata: { [PENDING_SIGNUP_KEY]: 'x' } } } as unknown as Session)).toBeNull()
    expect(getPendingSignup(null)).toBeNull()
  })

  test('computeEffectiveAttribution applique les UTM partenaire par défaut', () => {
    mockReadStoredAttribution.mockReturnValue(null)
    const result = computeEffectiveAttribution({ utm_source: 'lg', utm_medium: 'partner' })
    expect(result).toMatchObject({ utm_source: 'lg', utm_medium: 'partner', utm_campaign: null })
    expect(acquisitionFields(result)).toEqual({ utm_source: 'lg', utm_medium: 'partner' })
  })

  test('computeEffectiveAttribution garde les UTM capturés', () => {
    mockReadStoredAttribution.mockReturnValue({ ...attribution, utm_source: 'google' })
    expect(computeEffectiveAttribution({ utm_source: 'lg', utm_medium: 'x' })?.utm_source).toBe('google')
  })
})
