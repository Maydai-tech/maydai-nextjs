/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { DELETE } from '../route'

jest.mock('@/lib/api-auth', () => ({ getAuthenticatedSupabaseClient: jest.fn() }))

const id = '72000000-0000-4000-8000-000000000001'
const userId = '71000000-0000-4000-8000-000000000001'
const request = () => new NextRequest(`http://localhost/api/procurements/${id}`, { method: 'DELETE' })
const context = (value = id) => ({ params: Promise.resolve({ id: value }) })

describe('DELETE /api/procurements/:id', () => {
  const query = { delete: jest.fn(), eq: jest.fn(), select: jest.fn(), maybeSingle: jest.fn() }
  const supabase = { from: jest.fn() }
  beforeEach(() => {
    jest.resetAllMocks()
    supabase.from.mockReturnValue(query)
    query.delete.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.select.mockReturnValue(query)
    query.maybeSingle.mockResolvedValue({ data: { id }, error: null })
    jest.mocked(getAuthenticatedSupabaseClient).mockResolvedValue({ user: { id: userId }, supabase } as unknown as Awaited<ReturnType<typeof getAuthenticatedSupabaseClient>>)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  test('supprime uniquement l’appel d’offres du propriétaire authentifié', async () => {
    const response = await DELETE(request(), context())
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(query.eq).toHaveBeenCalledWith('id', id)
    expect(query.eq).toHaveBeenCalledWith('user_id', userId)
  })

  test('refuse une session absente ou invalide', async () => {
    jest.mocked(getAuthenticatedSupabaseClient).mockRejectedValue(new Error('Invalid token'))
    expect((await DELETE(request(), context())).status).toBe(401)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  test('refuse un identifiant malformé avant toute suppression', async () => {
    expect((await DELETE(request(), context('bad-id'))).status).toBe(400)
    expect(query.delete).not.toHaveBeenCalled()
  })

  test('renvoie 404 pour un appel absent ou invisible sans divulguer son propriétaire', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect((await DELETE(request(), context())).status).toBe(404)
  })

  test('ne prétend pas avoir supprimé en cas d’échec Supabase', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'private details' } })
    const response = await DELETE(request(), context())
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('private details')
  })
})
