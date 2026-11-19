/** @jest-environment node */

// Mocks des dépendances importées par lib/account-deletion (Stripe + logger)
jest.mock('@/lib/stripe/services/subscription', () => ({
  cancelStripeSubscription: jest.fn(),
}))

jest.mock('@/lib/stripe/config/client', () => ({
  getStripeClient: () => ({ customers: { del: jest.fn() } }),
}))

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createRequestContext: jest.fn(() => ({})),
}))

import { removeDossierStorageFiles } from '@/lib/account-deletion'
import { logger } from '@/lib/secure-logger'

/**
 * Client Supabase mocké, chaînable et "thenable" (même approche que
 * account-deletion.test.ts), avec un contrôle fin sur l'erreur de storage.remove.
 */
function createMockSupabase(config: {
  documents?: { file_url: string | null }[]
  fetchError?: { message: string }
  removeError?: { message: string }
} = {}) {
  const storageRemove = jest.fn().mockResolvedValue({ error: config.removeError ?? null })
  const storage = { from: jest.fn(() => ({ remove: storageRemove })) }

  const from = jest.fn((_table: string) => {
    const builder: any = {
      select: () => builder,
      in: () => builder,
      then: (resolve: (v: any) => any, reject?: (e: any) => any) => {
        const result = config.fetchError
          ? { data: null, error: config.fetchError }
          : { data: config.documents ?? [], error: null }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  })

  return { client: { from, storage } as any, from, storage, storageRemove }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('removeDossierStorageFiles', () => {
  test('supprime les chemins extraits des file_url et ignore les null', async () => {
    const mock = createMockSupabase({
      documents: [
        { file_url: 'https://x.supabase.co/storage/v1/object/public/dossiers/comp/u1/doc/a.pdf' },
        { file_url: null },
        { file_url: 'https://x.supabase.co/storage/v1/object/public/dossiers/comp/u1/doc/b.png' },
      ],
    })

    await removeDossierStorageFiles(mock.client, ['d1', 'd2'])

    expect(mock.storage.from).toHaveBeenCalledWith('dossiers')
    expect(mock.storageRemove).toHaveBeenCalledWith([
      'comp/u1/doc/a.pdf',
      'comp/u1/doc/b.png',
    ])
  })

  test('no-op (aucun appel Storage) quand la liste de dossiers est vide', async () => {
    const mock = createMockSupabase()

    await removeDossierStorageFiles(mock.client, [])

    expect(mock.from).not.toHaveBeenCalled()
    expect(mock.storage.from).not.toHaveBeenCalled()
    expect(mock.storageRemove).not.toHaveBeenCalled()
  })

  test('n\'appelle pas Storage quand aucun document n\'a de file_url valide', async () => {
    const mock = createMockSupabase({ documents: [{ file_url: null }] })

    await removeDossierStorageFiles(mock.client, ['d1'])

    expect(mock.storage.from).not.toHaveBeenCalled()
    expect(mock.storageRemove).not.toHaveBeenCalled()
  })

  test('best-effort : ne lève pas si storage.remove renvoie une erreur', async () => {
    const mock = createMockSupabase({
      documents: [
        { file_url: 'https://x.supabase.co/storage/v1/object/public/dossiers/comp/u1/doc/a.pdf' },
      ],
      removeError: { message: 'storage down' },
    })

    await expect(removeDossierStorageFiles(mock.client, ['d1'])).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalled()
  })

  test('lève si la lecture des dossier_documents échoue', async () => {
    const mock = createMockSupabase({ fetchError: { message: 'select boom' } })

    await expect(removeDossierStorageFiles(mock.client, ['d1'])).rejects.toThrow(/select boom/)
  })
})
