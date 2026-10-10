/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
jest.mock('@/lib/api-auth', () => ({ getAuthenticatedSupabaseClient: jest.fn() }))
const id = '73000000-0000-4000-8000-000000000001'
const userId = '73000000-0000-4000-8000-000000000002'
const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() }
const supabase = { from: jest.fn() }
const request = () => new NextRequest(`http://localhost/api/procurements/${id}`)
const context = (value = id) => ({ params: Promise.resolve({ id: value }) })
beforeEach(() => {
  jest.resetAllMocks()
  supabase.from.mockReturnValue(query); query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
  jest.mocked(getAuthenticatedSupabaseClient).mockResolvedValue({ user: { id: userId }, supabase } as unknown as Awaited<ReturnType<typeof getAuthenticatedSupabaseClient>>)
})
test('refuse une session absente', async () => {
  jest.mocked(getAuthenticatedSupabaseClient).mockRejectedValue(new Error('No token'))
  expect((await GET(request(), context())).status).toBe(401)
  expect(supabase.from).not.toHaveBeenCalled()
})
test('lit la configuration en filtrant par propriétaire', async () => {
  const procurement = { id, title: 'Mon appel', supplier_emails: ['supplier@example.com'] }
  query.maybeSingle.mockResolvedValue({ data: procurement, error: null })
  const response = await GET(request(), context())
  expect(response.status).toBe(200); expect(await response.json()).toEqual(procurement)
  expect(query.eq).toHaveBeenCalledWith('id', id); expect(query.eq).toHaveBeenCalledWith('user_id', userId)
})
test('renvoie 404 pour un appel absent ou inaccessible', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null })
  expect((await GET(request(), context())).status).toBe(404)
})
test('renvoie 404 pour un identifiant invalide', async () => {
  expect((await GET(request(), context('invalid'))).status).toBe(404)
  expect(supabase.from).not.toHaveBeenCalled()
})
test('renvoie une erreur générique pour une panne de stockage', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Secret detail' } })
  const response = await GET(request(), context())
  expect(response.status).toBe(500); expect(await response.text()).not.toContain('Secret detail')
  spy.mockRestore()
})
