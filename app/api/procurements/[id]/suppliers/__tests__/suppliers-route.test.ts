/** @jest-environment node */
import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { POST } from '../route'
import { DELETE } from '../[supplierId]/route'

jest.mock('@/lib/api-auth', () => ({ getAuthenticatedSupabaseClient: jest.fn() }))

const id = '74000000-0000-4000-8000-000000000001'
const supplierId = '74000000-0000-4000-8000-000000000002'
const userId = '74000000-0000-4000-8000-000000000003'
const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn(), upsert: jest.fn(), single: jest.fn(), delete: jest.fn() }
const supabase = { from: jest.fn() }
const post = (body: unknown) => new NextRequest(`http://localhost/api/procurements/${id}/suppliers`, { method: 'POST', body: JSON.stringify(body) })
const context = { params: Promise.resolve({ id }) }

beforeEach(() => {
  jest.resetAllMocks()
  supabase.from.mockReturnValue(query)
  for (const key of ['select', 'eq', 'upsert', 'delete'] as const) query[key].mockReturnValue(query)
  jest.mocked(getAuthenticatedSupabaseClient).mockResolvedValue({ user: { id: userId }, supabase } as unknown as Awaited<ReturnType<typeof getAuthenticatedSupabaseClient>>)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/procurements/:id/suppliers', () => {
  test('refuse une session absente', async () => {
    jest.mocked(getAuthenticatedSupabaseClient).mockRejectedValue(new Error('No token'))
    expect((await POST(post({ contact_email: 'a@b.fr' }), context)).status).toBe(401)
  })

  test('refuse un email invalide ou un SIREN mal formé', async () => {
    expect((await POST(post({ contact_email: 'invalid' }), context)).status).toBe(400)
    expect((await POST(post({ contact_email: 'a@b.fr', siren: '123' }), context)).status).toBe(400)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  test('renvoie 404 si l’appel d’offres n’appartient pas à l’utilisateur', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect((await POST(post({ contact_email: 'a@b.fr' }), context)).status).toBe(404)
    expect(query.eq).toHaveBeenCalledWith('user_id', userId)
    expect(query.upsert).not.toHaveBeenCalled()
  })

  test('enregistre le fournisseur nettoyé, ou complète celui qui a le même email', async () => {
    const row = { id: supplierId, contact_email: 'contact@jungle.fr', company_name: 'WELCOME TO THE JUNGLE', siren: '799352682', city: 'Paris' }
    query.maybeSingle.mockResolvedValue({ data: { id }, error: null })
    query.single.mockResolvedValue({ data: row, error: null })
    const response = await POST(post({ contact_email: ' Contact@Jungle.fr ', company_name: 'WELCOME TO THE JUNGLE', siren: '799352682', city: 'Paris' }), context)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(row)
    expect(query.upsert).toHaveBeenCalledWith({ procurement_id: id, contact_email: 'contact@jungle.fr', company_name: 'WELCOME TO THE JUNGLE', siren: '799352682', city: 'Paris' }, { onConflict: 'procurement_id,contact_email' })
  })
})

describe('DELETE /api/procurements/:id/suppliers/:supplierId', () => {
  const del = () => new NextRequest(`http://localhost/api/procurements/${id}/suppliers/${supplierId}`, { method: 'DELETE' })

  test('retire le fournisseur de cet appel d’offres', async () => {
    query.maybeSingle.mockResolvedValue({ data: { id: supplierId }, error: null })
    expect((await DELETE(del(), { params: Promise.resolve({ id, supplierId }) })).status).toBe(204)
    expect(query.eq).toHaveBeenCalledWith('procurement_id', id)
  })

  test('renvoie 404 pour un fournisseur absent ou un identifiant invalide', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null })
    expect((await DELETE(del(), { params: Promise.resolve({ id, supplierId }) })).status).toBe(404)
    expect((await DELETE(del(), { params: Promise.resolve({ id, supplierId: 'x' }) })).status).toBe(404)
  })
})
