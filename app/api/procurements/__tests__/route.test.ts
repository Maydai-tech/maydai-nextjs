/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { GET, POST } from '../route'

jest.mock('@/lib/api-auth', () => ({ getAuthenticatedSupabaseClient: jest.fn() }))

const userId = '71000000-0000-4000-8000-000000000001'
const configuration = { phase: 'consultation', criteria_importance: { human_oversight: 5, transparency: 5, social_ethics: 5, environment: 5, cybersecurity: 5, data_governance: 5 }, custom_questions: [], deadline_at: '2099-01-15T17:00:00.000Z', supplier_emails: ['supplier@example.com'] }
const procurement = { ...configuration, id: '72000000-0000-4000-8000-000000000001', user_id: userId, title: 'Assistant RH', description: '', created_at: '2026-10-09T12:00:00Z' }

function request(body: unknown = { title: 'Assistant RH', description: 'Besoin RH' }) {
  return new NextRequest('http://localhost/api/procurements', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...configuration, ...(body as object) }),
  })
}

describe('/api/procurements', () => {
  const query = {
    select: jest.fn(), eq: jest.fn(), order: jest.fn(), insert: jest.fn(), single: jest.fn(),
  }
  const supabase = { from: jest.fn() }

  beforeEach(() => {
    jest.resetAllMocks()
    supabase.from.mockReturnValue(query)
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.insert.mockReturnValue(query)
    query.single.mockResolvedValue({ data: procurement, error: null })
    jest.mocked(getAuthenticatedSupabaseClient).mockResolvedValue({ user: { id: userId }, supabase } as unknown as Awaited<ReturnType<typeof getAuthenticatedSupabaseClient>>)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  test.each([GET, POST])('refuse une session absente ou invalide', async (handler) => {
    jest.mocked(getAuthenticatedSupabaseClient).mockRejectedValue(new Error('Invalid token'))
    expect((await handler(request())).status).toBe(401)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  test('liste uniquement les appels du créateur, du plus récent au plus ancien', async () => {
    query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data: [procurement], error: null })
    const response = await GET(new NextRequest('http://localhost/api/procurements'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([procurement])
    expect(query.eq).toHaveBeenCalledWith('user_id', userId)
    expect(query.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false })
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false })
  })

  test('renvoie une liste vide sans résultats', async () => {
    query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data: null, error: null })
    expect(await (await GET(request())).json()).toEqual([])
  })

  test('crée avec le propriétaire authentifié et nettoie la saisie', async () => {
    const response = await POST(request({ title: ' Assistant RH ', description: ' Besoin RH ', user_id: 'another-user' }))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(procurement)
    expect(query.insert).toHaveBeenCalledWith({ ...configuration, title: 'Assistant RH', description: 'Besoin RH', user_id: userId })
  })

  test('refuse une description omise pour une nouvelle création', async () => {
    expect((await POST(request({ title: 'Assistant RH' }))).status).toBe(400)
    expect(query.insert).not.toHaveBeenCalled()
  })

  test.each([{}, { title: '' }, { title: '   ' }, { title: 42 }, { title: 'a'.repeat(201) }, { title: 'Valide', description: 'a'.repeat(5001) }, { title: 'Valide', description: null }])('refuse le formulaire invalide %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(query.insert).not.toHaveBeenCalled()
  })

  test('accepte les longueurs maximales', async () => {
    expect((await POST(request({ title: 'a'.repeat(200), description: 'a'.repeat(5000) }))).status).toBe(201)
  })

  test('refuse un corps JSON malformé', async () => {
    const response = await POST(new NextRequest('http://localhost/api/procurements', { method: 'POST', body: '{' }))
    expect(response.status).toBe(400)
    expect(query.insert).not.toHaveBeenCalled()
  })

  test('ne renvoie pas les détails internes lors d’un échec de création', async () => {
    query.single.mockResolvedValue({ data: null, error: { message: 'private database details' } })
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('private database details')
  })

  test('renvoie une erreur de chargement plutôt qu’une liste vide', async () => {
    query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data: null, error: { message: 'DB unavailable' } })
    expect((await GET(request())).status).toBe(500)
  })
})
