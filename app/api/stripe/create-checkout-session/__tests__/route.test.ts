/** @jest-environment node */

const customersCreate = jest.fn()
const sessionsCreate = jest.fn()

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/stripe/config/client', () => ({
  getStripeClient: () => ({
    customers: { create: (...args: unknown[]) => customersCreate(...args) },
    checkout: {
      sessions: { create: (...args: unknown[]) => sessionsCreate(...args) },
    },
  }),
}))

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { POST } from '../route'

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/stripe/create-checkout-session', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/stripe/create-checkout-session', () => {
  const authedUser = { id: 'user-alice' }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://maydai.io'
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user: authedUser,
      supabase: {},
    })
    customersCreate.mockResolvedValue({ id: 'cus_alice' })
    sessionsCreate.mockResolvedValue({ id: 'cs_test_1' })
  })

  test('refuse une requête non authentifiée et n’appelle pas Stripe', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(
      new Error('No authorization header')
    )

    const response = await POST(
      makeRequest(
        { priceId: 'price_123', mode: 'subscription', userId: 'user-bob' },
        false
      )
    )

    expect(response.status).toBe(401)
    expect(customersCreate).not.toHaveBeenCalled()
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  test('ignore le userId du body et rattache la session à l’utilisateur authentifié', async () => {
    const response = await POST(
      makeRequest({
        priceId: 'price_123',
        mode: 'subscription',
        userId: 'user-bob',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ sessionId: 'cs_test_1' })
    expect(customersCreate).toHaveBeenCalledWith({
      metadata: { user_id: 'user-alice' },
    })
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_alice',
        client_reference_id: 'user-alice',
        metadata: { user_id: 'user-alice', userId: 'user-alice' },
      })
    )
    expect(sessionsCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ client_reference_id: 'user-bob' })
    )
  })

  test('refuse un priceId au mauvais format', async () => {
    const response = await POST(
      makeRequest({ priceId: 'not-a-price', mode: 'subscription' })
    )

    expect(response.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})
