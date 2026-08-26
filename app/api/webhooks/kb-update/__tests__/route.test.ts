/** @jest-environment node */

const ingestAiActKnowledgeBase = jest.fn()

jest.mock('@/lib/rag-ingestion', () => ({
  ingestAiActKnowledgeBase: (...args: unknown[]) => ingestAiActKnowledgeBase(...args),
  isAiActDocsFolder: (folderName: string | undefined | null) =>
    typeof folderName === 'string' && folderName.trim() === '05_AI_Act_Docs',
}))

jest.mock('@/lib/google-drive', () => ({
  findFileIdByName: jest.fn(),
  getFileFromDrive: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'

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

describe('POST /api/webhooks/kb-update', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.INTERNAL_API_KEY = 'internal-key'
  })

  test('refuse une clé API invalide', async () => {
    const response = await POST(makeRequest({ folder_name: '05_AI_Act_Docs' }, 'bad'))
    expect(response.status).toBe(401)
    expect(ingestAiActKnowledgeBase).not.toHaveBeenCalled()
  })

  test('déclenche l\'ingestion RAG si folder_name = 05_AI_Act_Docs', async () => {
    ingestAiActKnowledgeBase.mockResolvedValue({
      documents_processed: 1,
      documents_ingested: 1,
      documents_skipped: 0,
      chunks_created: 4,
      errors: [],
    })

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
    expect(ingestAiActKnowledgeBase).toHaveBeenCalledTimes(1)
    expect(payload.source).toBe('ai_act_rag')
    expect(payload.success).toBe(true)
    expect(payload.documents_ingested).toBe(1)
    expect(payload.chunks_created).toBe(4)
  })

  test('retourne 500 si l\'ingestion RAG échoue sans aucun document', async () => {
    ingestAiActKnowledgeBase.mockResolvedValue({
      documents_processed: 1,
      documents_ingested: 0,
      documents_skipped: 0,
      chunks_created: 0,
      errors: ['Hash SHA-256 divergent'],
    })

    const response = await POST(
      makeRequest({
        folder_name: '05_AI_Act_Docs',
        file_name: 'AI_Act_Index.json',
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.success).toBe(false)
    expect(payload.errors).toEqual(['Hash SHA-256 divergent'])
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
})
