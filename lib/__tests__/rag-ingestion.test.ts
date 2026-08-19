/** @jest-environment node */

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { createHash } from 'node:crypto'
import {
  chunkAiActText,
  computeSha256,
  ingestAiActKnowledgeBase,
  isAiActDocsFolder,
  parseAiActIndex,
  planSupersession,
  type AiActIngestionDeps,
  type AiActIndexEntry,
} from '@/lib/rag-ingestion'

function sampleEntry(overrides: Partial<AiActIndexEntry> = {}): AiActIndexEntry {
  return {
    canonical_id: 'CELEX:02024R1689',
    drive_file_id: 'drive-1',
    file_name: 'ai-act.pdf',
    source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    version_date: '2024-06-13',
    document_type: 'regulation',
    hash: 'a'.repeat(64),
    status: 'active',
    ...overrides,
  }
}

function createSupabaseMock(initialDocuments: Array<Record<string, unknown>> = []) {
  const documents = initialDocuments.map((doc) => ({ ...doc }))
  const chunks: Array<Record<string, unknown>> = []

  const from = jest.fn((table: string) => {
    if (table === 'ai_act_documents') {
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            const first = documents.filter((doc) => doc[column] === value)
            return {
              eq: (column2: string, value2: unknown) => ({
                maybeSingle: async () => ({
                  data: first.find((doc) => doc[column2] === value2) ?? null,
                  error: null,
                }),
              }),
              maybeSingle: async () => ({
                data: first[0] ?? null,
                error: null,
              }),
            }
          },
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: async (column: string, value: unknown) => {
            documents.forEach((doc) => {
              if (doc[column] === value) Object.assign(doc, payload)
            })
            return { error: null }
          },
        }),
        insert: (row: Record<string, unknown>) => {
          const inserted = { id: `new-${documents.length + 1}`, ...row }
          documents.push(inserted)
          return {
            select: () => ({
              single: async () => ({ data: inserted, error: null }),
            }),
          }
        },
        delete: () => ({
          eq: async (column: string, value: unknown) => {
            const index = documents.findIndex((doc) => doc[column] === value)
            if (index >= 0) documents.splice(index, 1)
            return { error: null }
          },
        }),
      }
    }

    if (table === 'ai_act_chunks') {
      return {
        insert: async (rows: Array<Record<string, unknown>>) => {
          chunks.push(...rows)
          return { error: null }
        },
      }
    }

    throw new Error(`Table inattendue: ${table}`)
  })

  return { client: { from } as AiActIngestionDeps['supabase'], documents, chunks, from }
}

describe('RAG AI Act — parsing et versioning', () => {
  test('isAiActDocsFolder ne matche que le dossier canonique', () => {
    expect(isAiActDocsFolder('05_AI_Act_Docs')).toBe(true)
    expect(isAiActDocsFolder(' 05_AI_Act_Docs ')).toBe(true)
    expect(isAiActDocsFolder('04_ComparIA')).toBe(false)
    expect(isAiActDocsFolder(undefined)).toBe(false)
  })

  test('parseAiActIndex accepte un tableau valide et normalise le hash', () => {
    const parsed = parseAiActIndex(JSON.stringify([sampleEntry({ hash: 'B'.repeat(64) })]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0].hash).toBe('b'.repeat(64))
    expect(parsed[0].canonical_id).toBe('CELEX:02024R1689')
  })

  test('parseAiActIndex rejette un JSON invalide ou un champ manquant', () => {
    expect(() => parseAiActIndex('{')).toThrow(/JSON valide/)
    expect(() => parseAiActIndex(JSON.stringify([{ ...sampleEntry(), canonical_id: '' }]))).toThrow(
      /invalide/
    )
  })

  test('parseAiActIndex rejette deux canonical_id actifs identiques', () => {
    expect(() =>
      parseAiActIndex(JSON.stringify([sampleEntry(), sampleEntry({ hash: 'c'.repeat(64) })]))
    ).toThrow(/canonical_id actif en double/)
  })

  test('planSupersession pointe supersedes_id vers l\'ancien document actif', () => {
    expect(planSupersession(null)).toEqual({ deactivateId: null, supersedesId: null })
    expect(planSupersession('old-1')).toEqual({
      deactivateId: 'old-1',
      supersedesId: 'old-1',
    })
  })

  test('chunkAiActText découpe les longs textes sans perdre le contenu', () => {
    const text = `${'Article 1.\n\n'}${'x'.repeat(2000)}\n\nArticle 2. court`
    const chunks = chunkAiActText(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toContain('Article 2. court')
    expect(chunks.every((chunk) => chunk.length <= 1600)).toBe(true)
  })
})

describe('ingestAiActKnowledgeBase', () => {
  test('saute un document dont le hash est déjà en base', async () => {
    const hash = 'a'.repeat(64)
    const db = createSupabaseMock([{ id: 'existing', hash, canonical_id: 'CELEX:02024R1689' }])
    const downloadFile = jest.fn()

    const result = await ingestAiActKnowledgeBase({
      fetchIndexJson: async () => JSON.stringify([sampleEntry({ hash })]),
      downloadFile,
      extractText: jest.fn(),
      embedTexts: jest.fn(),
      supabase: db.client,
    })

    expect(result.documents_skipped).toBe(1)
    expect(result.documents_ingested).toBe(0)
    expect(downloadFile).not.toHaveBeenCalled()
  })

  test('désactive N-1, insère N avec supersedes_id et crée les chunks', async () => {
    const pdf = Buffer.from('pdf-bytes')
    const hash = computeSha256(pdf)
    const db = createSupabaseMock([
      {
        id: 'old-doc',
        canonical_id: 'CELEX:02024R1689',
        hash: 'd'.repeat(64),
        is_active: true,
      },
    ])

    const result = await ingestAiActKnowledgeBase({
      fetchIndexJson: async () => JSON.stringify([sampleEntry({ hash })]),
      downloadFile: async () => pdf,
      extractText: async () => 'Article 6.\n\nAnnexe III.',
      embedTexts: async (texts) => texts.map(() => Array(1024).fill(0.01)),
      supabase: db.client,
    })

    expect(result.documents_ingested).toBe(1)
    expect(result.chunks_created).toBeGreaterThan(0)
    expect(result.errors).toEqual([])

    const oldDoc = db.documents.find((doc) => doc.id === 'old-doc')
    const newDoc = db.documents.find((doc) => doc.id !== 'old-doc')
    expect(oldDoc?.is_active).toBe(false)
    expect(newDoc?.is_active).toBe(true)
    expect(newDoc?.supersedes_id).toBe('old-doc')
    expect(db.chunks).toHaveLength(result.chunks_created)
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(hash)
  })

  test('refuse un PDF dont le SHA-256 ne correspond pas à l\'index', async () => {
    const result = await ingestAiActKnowledgeBase({
      fetchIndexJson: async () => JSON.stringify([sampleEntry()]),
      downloadFile: async () => Buffer.from('autre-contenu'),
      extractText: jest.fn(),
      embedTexts: jest.fn(),
      supabase: createSupabaseMock().client,
    })

    expect(result.documents_ingested).toBe(0)
    expect(result.errors[0]).toMatch(/Hash SHA-256 divergent/)
  })
})
