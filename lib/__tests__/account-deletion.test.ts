/** @jest-environment node */

// Mocks Stripe + logger (le module lib/account-deletion les importe)
const mockCancelStripeSubscription = jest.fn()
const mockCustomersDel = jest.fn()

jest.mock('@/lib/stripe/services/subscription', () => ({
  cancelStripeSubscription: (...args: unknown[]) => mockCancelStripeSubscription(...args),
}))

jest.mock('@/lib/stripe/config/client', () => ({
  getStripeClient: () => ({ customers: { del: (...args: unknown[]) => mockCustomersDel(...args) } }),
}))

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createRequestContext: jest.fn(() => ({})),
}))

import { deleteCompanyCascade, deleteUserAccount, buildDeletionPreview } from '@/lib/account-deletion'

/**
 * Construit un client Supabase mocké, chaînable et "thenable".
 *
 * @param config.tables  réponses par table : { selectData, single, count, error }
 *                        (error s'applique à l'opération terminale de cette table)
 */
function createMockSupabase(config: {
  tables?: Record<string, { selectData?: any[]; single?: any; count?: number; error?: any }>
  authDeleteError?: any
} = {}) {
  const ops: { table: string; op: string }[] = []
  const tables = config.tables || {}

  const auth = {
    admin: {
      deleteUser: jest.fn().mockResolvedValue({ error: config.authDeleteError ?? null }),
    },
  }

  const storageRemove = jest.fn().mockResolvedValue({ error: null })
  const storage = { from: jest.fn(() => ({ remove: storageRemove })) }

  const from = jest.fn((table: string) => {
    const state = { op: 'select', single: false, head: false }

    const builder: any = {
      select: (_cols?: string, opts?: { head?: boolean }) => {
        state.op = 'select'
        if (opts?.head) state.head = true
        return builder
      },
      delete: () => { state.op = 'delete'; return builder },
      update: () => { state.op = 'update'; return builder },
      eq: () => builder,
      neq: () => builder,
      in: () => builder,
      or: () => builder,
      single: () => { state.single = true; return builder },
      then: (resolve: (v: any) => any, reject?: (e: any) => any) => {
        const t = tables[table] || {}
        let result: any
        if (state.op === 'select') {
          if (state.head) result = { count: t.count ?? 0, error: t.error ?? null }
          else if (state.single) result = { data: t.single ?? null, error: t.error ?? null }
          else result = { data: t.selectData ?? [], error: t.error ?? null }
        } else {
          result = { data: null, error: t.error ?? null }
        }
        ops.push({ table, op: state.single ? `${state.op}.single` : state.op })
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  })

  return { client: { from, auth, storage } as any, ops, auth, from, storage, storageRemove }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('account-deletion', () => {
  describe('deleteCompanyCascade', () => {
    test('supprime les données dans le bon ordre', async () => {
      const mock = createMockSupabase({
        tables: { usecases: { selectData: [{ id: 'u1' }, { id: 'u2' }] } },
      })

      await deleteCompanyCascade(mock.client, 'company-1')

      const tablesTouched = mock.from.mock.calls.map((c) => c[0])
      // Toutes les tables enfant en NO ACTION doivent être vidées (sinon violation FK)
      expect(tablesTouched).toEqual(
        expect.arrayContaining([
          'usecases', 'usecase_responses', 'usecase_history', 'usecase_nextsteps',
          'user_usecases', 'contact_requests', 'profiles', 'user_companies', 'companies'
        ])
      )
      // L'ordre relatif des DELETE : enfants des usecases avant usecases avant companies
      const deleteOrder = mock.ops.filter((o) => o.op === 'delete').map((o) => o.table)
      expect(deleteOrder.indexOf('usecase_history')).toBeLessThan(deleteOrder.indexOf('usecases'))
      expect(deleteOrder.indexOf('usecase_nextsteps')).toBeLessThan(deleteOrder.indexOf('usecases'))
      expect(deleteOrder.indexOf('usecases')).toBeLessThan(deleteOrder.indexOf('companies'))
      expect(deleteOrder.indexOf('user_companies')).toBeLessThan(deleteOrder.indexOf('companies'))
    })

    test('ne supprime pas de réponses quand il n\'y a aucun usecase', async () => {
      const mock = createMockSupabase({ tables: { usecases: { selectData: [] } } })

      await deleteCompanyCascade(mock.client, 'company-1')

      const tablesTouched = mock.from.mock.calls.map((c) => c[0])
      expect(tablesTouched).not.toContain('usecase_responses')
      expect(tablesTouched).toContain('companies')
    })

    test('supprime les fichiers Storage des dossiers avant les lignes', async () => {
      const mock = createMockSupabase({
        tables: {
          usecases: { selectData: [{ id: 'u1' }] },
          dossiers: { selectData: [{ id: 'd1' }] },
          dossier_documents: {
            selectData: [
              { file_url: 'https://x.supabase.co/storage/v1/object/public/dossiers/comp/u1/doc/file.pdf' },
              { file_url: null },
            ],
          },
        },
      })

      await deleteCompanyCascade(mock.client, 'comp')

      expect(mock.storage.from).toHaveBeenCalledWith('dossiers')
      expect(mock.storageRemove).toHaveBeenCalledWith(['comp/u1/doc/file.pdf'])
      const tablesTouched = mock.from.mock.calls.map((c) => c[0])
      expect(tablesTouched).toEqual(expect.arrayContaining(['dossier_documents', 'dossiers']))
    })

    test('lève une erreur si la suppression de la company échoue', async () => {
      const mock = createMockSupabase({
        tables: {
          usecases: { selectData: [] },
          companies: { error: { message: 'FK violation' } },
        },
      })

      await expect(deleteCompanyCascade(mock.client, 'company-1')).rejects.toThrow(/FK violation/)
    })
  })

  describe('deleteUserAccount', () => {
    test('orchestre Stripe, cascade, profil et suppression auth', async () => {
      const mock = createMockSupabase({
        tables: {
          subscriptions: { selectData: [{ stripe_subscription_id: 'sub_1', stripe_customer_id: 'cus_1' }] },
          user_companies: { selectData: [{ company_id: 'company-1' }] },
          usecases: { selectData: [{ id: 'u1' }] },
        },
      })

      await deleteUserAccount(mock.client, 'user-1')

      expect(mockCancelStripeSubscription).toHaveBeenCalledWith('sub_1', true)
      expect(mockCustomersDel).toHaveBeenCalledWith('cus_1')

      const tablesTouched = mock.from.mock.calls.map((c) => c[0])
      expect(tablesTouched).toEqual(
        expect.arrayContaining(['subscriptions', 'user_companies', 'companies', 'leads', 'profiles'])
      )
      expect(mock.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
    })

    test('fonctionne sans abonnement Stripe', async () => {
      const mock = createMockSupabase({
        tables: {
          subscriptions: { selectData: [] },
          user_companies: { selectData: [] },
        },
      })

      await deleteUserAccount(mock.client, 'user-1')

      expect(mockCancelStripeSubscription).not.toHaveBeenCalled()
      expect(mockCustomersDel).not.toHaveBeenCalled()
      expect(mock.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
    })

    test('supprime toutes les companies possédées (multi-companies)', async () => {
      const mock = createMockSupabase({
        tables: {
          subscriptions: { selectData: [] },
          user_companies: { selectData: [{ company_id: 'c1' }, { company_id: 'c2' }] },
          usecases: { selectData: [] },
        },
      })

      await deleteUserAccount(mock.client, 'user-1')

      // companies supprimée une fois par company possédée
      const companyDeletes = mock.from.mock.calls.filter((c) => c[0] === 'companies')
      expect(companyDeletes.length).toBe(2)
    })

    test('lève une erreur si la suppression du compte auth échoue', async () => {
      const mock = createMockSupabase({
        tables: { subscriptions: { selectData: [] }, user_companies: { selectData: [] } },
        authDeleteError: { message: 'auth delete failed' },
      })

      await expect(deleteUserAccount(mock.client, 'user-1')).rejects.toThrow(/auth delete failed/)
    })
  })

  describe('buildDeletionPreview', () => {
    test('classe les companies possédées et collaborées', async () => {
      // user_companies (memberships) renvoie les rôles ; companies.single renvoie un nom
      const mock = createMockSupabase({
        tables: {
          user_companies: {
            selectData: [
              { company_id: 'owned-1', role: 'owner' },
              { company_id: 'collab-1', role: 'user' },
            ],
          },
          companies: { single: { name: 'Acme' } },
          usecases: { count: 3 },
        },
      })

      const preview = await buildDeletionPreview(mock.client, 'user-1')

      expect(preview.ownedCompanies).toHaveLength(1)
      expect(preview.ownedCompanies[0].id).toBe('owned-1')
      expect(preview.collaboratingCompanies).toHaveLength(1)
      expect(preview.collaboratingCompanies[0].id).toBe('collab-1')
    })
  })
})
