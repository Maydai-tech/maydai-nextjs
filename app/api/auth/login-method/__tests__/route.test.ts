/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getUserByEmail } from '@/lib/invite-user'
import { POST } from '../route'

jest.mock('@/lib/invite-user', () => ({ getUserByEmail: jest.fn() }))

const mockGetUser = jest.mocked(getUserByEmail)
let ip = 0
const post = (body: unknown, forwardedFor = `198.51.100.${(ip += 1)}`) =>
  POST(new NextRequest('http://localhost/api/auth/login-method', { method: 'POST', body: JSON.stringify(body), headers: { 'x-forwarded-for': forwardedFor } }))
const found = (user_metadata: Record<string, unknown>) =>
  ({ user: { id: 'u1', user_metadata }, error: null }) as unknown as Awaited<ReturnType<typeof getUserByEmail>>

beforeEach(() => jest.resetAllMocks())

describe('POST /api/auth/login-method', () => {
  test('ancien compte sans mot de passe choisi → code', async () => {
    mockGetUser.mockResolvedValue(found({}))
    const response = await post({ email: ' Paul@Ardoise.fr ' })
    expect(await response.json()).toEqual({ method: 'code' })
    expect(mockGetUser).toHaveBeenCalledWith('paul@ardoise.fr')
  })

  test('compte qui a choisi un mot de passe → mot de passe', async () => {
    mockGetUser.mockResolvedValue(found({ has_password: true }))
    expect(await (await post({ email: 'sophie@ex.fr' })).json()).toEqual({ method: 'password' })
  })

  test('email inconnu → mot de passe, sans révéler l’absence de compte', async () => {
    mockGetUser.mockResolvedValue({ user: undefined, error: null })
    const response = await post({ email: 'inconnu@ex.fr' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ method: 'password' })
  })

  test('email invalide ou corps illisible → 400 sans recherche', async () => {
    expect((await post({ email: 'pas-un-email' })).status).toBe(400)
    expect((await POST(new NextRequest('http://localhost/api/auth/login-method', { method: 'POST', body: '{' }))).status).toBe(400)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  test('au-delà de 10 demandes par minute depuis la même adresse → 429 sans recherche', async () => {
    mockGetUser.mockResolvedValue({ user: undefined, error: null })
    for (let i = 0; i < 10; i += 1) expect((await post({ email: 'a@b.fr' }, '203.0.113.50')).status).toBe(200)
    mockGetUser.mockClear()
    expect((await post({ email: 'a@b.fr' }, '203.0.113.50')).status).toBe(429)
    expect(mockGetUser).not.toHaveBeenCalled()
    expect((await post({ email: 'a@b.fr' }, '203.0.113.51')).status).toBe(200)
  })

  test('panne de la recherche → 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({ user: undefined, error: new Error('down') } as unknown as Awaited<ReturnType<typeof getUserByEmail>>)
    expect((await post({ email: 'a@b.fr' })).status).toBe(500)
  })
})
