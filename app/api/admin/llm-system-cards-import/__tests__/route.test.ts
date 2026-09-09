/** @jest-environment node */

const mockVerifyAdminAuth = jest.fn()
const mockImport = jest.fn()
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ service: true }))
const mockCreateDeps = jest.fn((supabase: unknown) => ({ deps: true, supabase }))

jest.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}))

jest.mock('@/lib/bench-llm/system-cards-import', () => ({
  importSystemCardsFromControlTower: (...args: unknown[]) => mockImport(...args),
  createDefaultSystemCardsImportDeps: (...args: unknown[]) => mockCreateDeps(...args),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

import { NextRequest, NextResponse } from 'next/server'

import { POST } from '../route'

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/llm-system-cards-import', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token' },
  })
}

describe('POST /api/admin/llm-system-cards-import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mockVerifyAdminAuth.mockResolvedValue({
      user: { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
    })
  })

  test('returns 401 when admin auth fails', async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(401)
    expect(mockImport).not.toHaveBeenCalled()
  })

  test('imports ready system cards and returns the structured payload', async () => {
    mockImport.mockResolvedValue({
      success: true,
      processed: 2,
      inserted: 2,
      skipped: [],
      errors: [],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith('http://localhost:54321', 'service-key')
    expect(mockImport).toHaveBeenCalledWith({ deps: true, supabase: { service: true } })
    expect(await response.json()).toMatchObject({
      success: true,
      processed: 2,
      inserted: 2,
      skipped: [],
      errors: [],
      message:
        '2 fiche(s) importée(s), 0 ignorée(s) (version plus ancienne), 0 en erreur',
    })
  })

  test('returns 200 when there is no ready row', async () => {
    mockImport.mockResolvedValue({
      success: true,
      processed: 0,
      inserted: 0,
      skipped: [],
      errors: [],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      message: 'Aucune ligne prête pour import (Prêt pour import = Oui).',
    })
  })

  test('returns 200 when every ready row is skipped by the version guard', async () => {
    mockImport.mockResolvedValue({
      success: true,
      processed: 1,
      inserted: 0,
      skipped: ['version plus ancienne ignorée (base: 2024-06-20, fichier: 2024-01-10)'],
      errors: [],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      inserted: 0,
      skipped: ['version plus ancienne ignorée (base: 2024-06-20, fichier: 2024-01-10)'],
      errors: [],
      message:
        '0 fiche(s) importée(s), 1 ignorée(s) (version plus ancienne), 0 en erreur',
    })
  })

  test('returns 207 when upserts and technical errors are mixed', async () => {
    mockImport.mockResolvedValue({
      success: false,
      processed: 2,
      inserted: 1,
      skipped: [],
      errors: ['Broken: Fichier Markdown vide'],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(207)
    expect(await response.json()).toMatchObject({
      inserted: 1,
      skipped: [],
      errors: ['Broken: Fichier Markdown vide'],
      message:
        '1 fiche(s) importée(s), 0 ignorée(s) (version plus ancienne), 1 en erreur. Broken: Fichier Markdown vide',
    })
  })

  test('returns 200 when upserts and version-guard skips are mixed without technical errors', async () => {
    mockImport.mockResolvedValue({
      success: true,
      processed: 2,
      inserted: 1,
      skipped: ['version plus ancienne ignorée (base: 2024-06-20, fichier: 2024-01-10)'],
      errors: [],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      message:
        '1 fiche(s) importée(s), 1 ignorée(s) (version plus ancienne), 0 en erreur',
    })
  })

  test('returns 500 when the import throws', async () => {
    mockImport.mockRejectedValue(new Error('CSV introuvable'))

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      success: false,
      processed: 0,
      inserted: 0,
      skipped: [],
      errors: ['CSV introuvable'],
    })
  })

  test('returns 500 when there is no upsert and at least one technical error', async () => {
    mockImport.mockResolvedValue({
      success: false,
      processed: 1,
      inserted: 0,
      skipped: [],
      errors: ['Broken: Fichier Markdown vide'],
    })

    const response = await POST(makeRequest())

    expect(response.status).toBe(500)
  })
})
