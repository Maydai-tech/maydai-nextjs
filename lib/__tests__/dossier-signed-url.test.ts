/** @jest-environment node */

import {
  isActiveCompanyMembership,
  userCanAccessDossierPath,
  userHasActiveCompanyMembership,
} from '@/lib/dossier-signed-url'

function createMembershipClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result)
  const eqCompany = jest.fn(() => ({ maybeSingle }))
  const eqUser = jest.fn(() => ({ eq: eqCompany, maybeSingle }))
  const select = jest.fn(() => ({ eq: eqUser }))
  const from = jest.fn(() => ({ select }))
  return {
    client: { from } as any,
    from,
    select,
    eqUser,
    eqCompany,
    maybeSingle,
  }
}

describe('isActiveCompanyMembership', () => {
  test('refuse une adhésion explicitement désactivée', () => {
    expect(isActiveCompanyMembership(false)).toBe(false)
  })

  test('accepte une adhésion active ou sans drapeau (owners historiques)', () => {
    expect(isActiveCompanyMembership(true)).toBe(true)
    expect(isActiveCompanyMembership(null)).toBe(true)
    expect(isActiveCompanyMembership(undefined)).toBe(true)
  })
})

describe('userHasActiveCompanyMembership', () => {
  test('refuse un membre soft-delete (is_active=false)', async () => {
    const { client } = createMembershipClient({
      data: { user_id: 'user-1', is_active: false },
      error: null,
    })

    await expect(
      userHasActiveCompanyMembership(client, 'user-1', 'company-1')
    ).resolves.toBe(false)
  })

  test('autorise un membre actif', async () => {
    const { client, select, eqUser, eqCompany } = createMembershipClient({
      data: { user_id: 'user-1', is_active: true },
      error: null,
    })

    await expect(
      userHasActiveCompanyMembership(client, 'user-1', 'company-1')
    ).resolves.toBe(true)
    expect(select).toHaveBeenCalledWith('user_id, is_active')
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })

  test('autorise une ligne sans is_active (création registre owner)', async () => {
    const { client } = createMembershipClient({
      data: { user_id: 'user-1' },
      error: null,
    })

    await expect(
      userHasActiveCompanyMembership(client, 'user-1', 'company-1')
    ).resolves.toBe(true)
  })

  test('refuse une absence de ligne ou une erreur', async () => {
    const missing = createMembershipClient({ data: null, error: null })
    await expect(
      userHasActiveCompanyMembership(missing.client, 'user-1', 'company-1')
    ).resolves.toBe(false)

    const failed = createMembershipClient({ data: null, error: { message: 'db' } })
    await expect(
      userHasActiveCompanyMembership(failed.client, 'user-1', 'company-1')
    ).resolves.toBe(false)
  })
})

describe('userCanAccessDossierPath', () => {
  test('refuse un membre révoqué même s’il connaît le chemin de preuve', async () => {
    const { client } = createMembershipClient({
      data: { user_id: 'user-1', is_active: false },
      error: null,
    })

    await expect(
      userCanAccessDossierPath(client, 'user-1', 'company-1/usecase-1/doc/preuve.pdf')
    ).resolves.toBe(false)
  })

  test('autorise un membre actif sur le préfixe entreprise', async () => {
    const { client, eqCompany } = createMembershipClient({
      data: { user_id: 'user-1', is_active: true },
      error: null,
    })

    await expect(
      userCanAccessDossierPath(client, 'user-1', 'company-1/usecase-1/doc/preuve.pdf')
    ).resolves.toBe(true)
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })
})
