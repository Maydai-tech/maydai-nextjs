/** @jest-environment node */

const ingestAiActKnowledgeBase = jest.fn()
const persistCompariaCatalog = jest.fn()
const createClient = jest.fn()

jest.mock('@/lib/rag-ingestion', () => ({
  ingestAiActKnowledgeBase: (...args: unknown[]) => ingestAiActKnowledgeBase(...args),
  isAiActDocsFolder: (folderName: string | undefined | null) =>
    typeof folderName === 'string' && folderName.trim() === '05_AI_Act_Docs',
}))

jest.mock('@/lib/google-drive', () => ({
  findFileIdByName: jest.fn(),
  getFileFromDrive: jest.fn(),
}))

jest.mock('@/lib/comparia/catalog-sync', () => ({
  persistCompariaCatalog: (...args: unknown[]) => persistCompariaCatalog(...args),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}))

import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import { findFileIdByName, getFileFromDrive } from '@/lib/google-drive'
import { POST } from '../route'

const EMBEDDING = Array.from({ length: 1024 }, (_, index) => index * 0.0001)

const VEILLE_DOCUMENT = {
  canonical_id: 'art-6-annexe-iii',
  file_name: 'article-6.md',
  source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1689',
  version_date: '2024-08-01',
  document_type: 'regulation',
  content: 'Résumé de veille sur l’annexe III.',
}

function makeRequest(body: unknown, apiKey = 'internal-key') {
  return new NextRequest('http://localhost/api/webhooks/kb-update', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })
}

function makeSupabaseMock(options?: {
  existingHashId?: string | null
  existingActiveId?: string | null
  insertDocumentId?: string
  insertDocumentError?: string
  insertChunkError?: string
}) {
  const insertDocument = jest.fn()
  const insertChunk = jest.fn()
  const updateDocuments = jest.fn()
  const deleteDocuments = jest.fn()

  createClient.mockReturnValue({
    from: (table: string) => {
      if (table === 'ai_act_documents') {
        return {
          select: () => ({
            eq: (column: string) => {
              if (column === 'hash') {
                return {
                  maybeSingle: async () => ({
                    data: options?.existingHashId
                      ? { id: options.existingHashId }
                      : null,
                    error: null,
                  }),
                }
              }
              return {
                eq: () => ({
                  maybeSingle: async () => ({
                    data: options?.existingActiveId
                      ? { id: options.existingActiveId }
                      : null,
                    error: null,
                  }),
                }),
              }
            },
          }),
          insert: (row: unknown) => {
            insertDocument(row)
            return {
              select: () => ({
                single: async () => {
                  if (options?.insertDocumentError) {
                    return {
                      data: null,
                      error: { message: options.insertDocumentError },
                    }
                  }
                  return {
                    data: { id: options?.insertDocumentId ?? 'doc-uuid' },
                    error: null,
                  }
                },
              }),
            }
          },
          update: (row: unknown) => {
            updateDocuments(row)
            return {
              eq: async () => ({ error: null }),
            }
          },
          delete: () => {
            deleteDocuments()
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }

      if (table === 'ai_act_chunks') {
        return {
          insert: async (row: unknown) => {
            insertChunk(row)
            if (options?.insertChunkError) {
              return { error: { message: options.insertChunkError } }
            }
            return { error: null }
          },
        }
      }

      throw new Error(`Table inattendue: ${table}`)
    },
  })

  return { insertDocument, insertChunk, updateDocuments, deleteDocuments }
}

describe('POST /api/webhooks/kb-update', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_API_KEY = 'internal-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    process.env.MISTRAL_API_KEY = 'mistral-key'
    createClient.mockReturnValue({ from: jest.fn() })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: EMBEDDING, index: 0 }] }),
    }) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('refuse une clé API invalide', async () => {
    const response = await POST(makeRequest({ folder_name: '05_AI_Act_Docs' }, 'bad'))
    expect(response.status).toBe(401)
    expect(ingestAiActKnowledgeBase).not.toHaveBeenCalled()
  })

  test('déclenche l\'ingestion RAG si folder_name = 05_AI_Act_Docs', async () => {
    const { insertDocument, insertChunk } = makeSupabaseMock()
    jest.mocked(findFileIdByName).mockResolvedValue('index-file-id')
    jest.mocked(getFileFromDrive).mockResolvedValue(
      JSON.stringify({ documents: [VEILLE_DOCUMENT] })
    )

    const response = await POST(
      makeRequest({
        event: 'file_updated',
        source: 'hermes',
        folder_name: '05_AI_Act_Docs',
        subfolder_name: 'regulations',
        file_name: 'AI_Act_Index.json',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(findFileIdByName).toHaveBeenCalledWith('AI_Act_Index.json')
    expect(insertDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        canonical_id: VEILLE_DOCUMENT.canonical_id,
        drive_file_id: 'veille-json-source',
        file_name: VEILLE_DOCUMENT.file_name,
        source_url: VEILLE_DOCUMENT.source_url,
        version_date: VEILLE_DOCUMENT.version_date,
        document_type: VEILLE_DOCUMENT.document_type,
        hash: createHash('sha256').update(VEILLE_DOCUMENT.content, 'utf8').digest('hex'),
        is_active: true,
      })
    )
    expect(insertChunk).toHaveBeenCalledWith(
      expect.objectContaining({
        document_id: 'doc-uuid',
        chunk_index: 0,
        content: VEILLE_DOCUMENT.content,
        embedding: EMBEDDING,
      })
    )
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(payload.source).toBe('ai_act_rag')
    expect(payload.success).toBe(true)
    expect(payload.documents_inserted).toBe(1)
    expect(payload.chunks_created).toBe(1)
  })

  test('retourne 500 si l\'ingestion RAG échoue sans aucun document', async () => {
    makeSupabaseMock()
    jest.mocked(findFileIdByName).mockResolvedValue('index-file-id')
    jest.mocked(getFileFromDrive).mockResolvedValue(
      JSON.stringify({ documents: [VEILLE_DOCUMENT] })
    )
    jest.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    } as Response)

    const response = await POST(
      makeRequest({
        folder_name: '05_AI_Act_Docs',
        file_name: 'AI_Act_Index.json',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.success).toBe(false)
    expect(payload.documents_inserted).toBe(0)
    expect(payload.errors[0]).toMatch(/art-6-annexe-iii/)
  })

  test('exige file_name hors du dossier AI Act', async () => {
    const response = await POST(
      makeRequest({
        folder_name: '04_ComparIA',
        file_name: '',
      })
    )
    expect(response.status).toBe(400)
    expect(ingestAiActKnowledgeBase).not.toHaveBeenCalled()
  })

  test('écrit le CSV Compar:IA dans comparia_models via le catalogue, pas comparia_rankings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    const csv = `Rank,id,Bradley-Terry Score,BT p2.5,BT p97.5,Confidence interval,Rank p2.5,Rank p97.5,Total votes,Consumption mWh (1000 tokens),Size,Parameters (B),Architecture,Release,Organisation,License
1,gpt-5.3,1144,1126,1165,+0/-5,1,6,1454,N/A,L,N/A,maybe-moe,03/2026,OpenAI,api-only`
    jest.mocked(findFileIdByName).mockResolvedValue('file-id')
    jest.mocked(getFileFromDrive).mockResolvedValue(csv)
    persistCompariaCatalog.mockResolvedValue({
      rowsImported: 1,
      exactLinksCreated: 1,
      modelsDeactivated: 0,
    })

    const response = await POST(
      makeRequest({
        folder_name: '04_ComparIA',
        file_name: 'leaderboard.csv',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(persistCompariaCatalog).toHaveBeenCalledTimes(1)
    expect(persistCompariaCatalog.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        fileName: 'leaderboard.csv',
        rows: [expect.objectContaining({ source_id: 'gpt-5.3', rank: 1 })],
      }),
    )
    expect(payload).toEqual({
      success: true,
      models_updated: 1,
      exact_links_created: 1,
      models_deactivated: 0,
    })
  })

  test('ignore un document de veille déjà présent (hash identique)', async () => {
    const { insertDocument, insertChunk } = makeSupabaseMock({
      existingHashId: 'already-there',
    })
    jest.mocked(findFileIdByName).mockResolvedValue('index-file-id')
    jest.mocked(getFileFromDrive).mockResolvedValue(
      JSON.stringify({ documents: [VEILLE_DOCUMENT] })
    )

    const response = await POST(
      makeRequest({
        folder_name: '05_AI_Act_Docs',
        file_name: 'AI_Act_Index.json',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(insertDocument).not.toHaveBeenCalled()
    expect(insertChunk).not.toHaveBeenCalled()
    expect(payload.documents_skipped).toBe(1)
    expect(payload.documents_inserted).toBe(0)
  })
})
