/** @jest-environment node */

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import {
  assertEmbeddingDimension,
  embedAiActTexts,
  extractAiActFileText,
  MISTRAL_EMBED_DIMENSIONS,
} from '@/lib/ai-act-mistral'

describe('ai-act-mistral', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.MISTRAL_API_KEY = 'test-mistral-key'
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('assertEmbeddingDimension refuse une taille autre que 1024', () => {
    expect(() => assertEmbeddingDimension([0.1, 0.2])).toThrow(/1024/)
    expect(assertEmbeddingDimension(Array(MISTRAL_EMBED_DIMENSIONS).fill(0.1))).toHaveLength(1024)
  })

  test('embedAiActTexts envoie mistral-embed et conserve l\'ordre', async () => {
    const embeddingA = Array(1024).fill(0.1)
    const embeddingB = Array(1024).fill(0.2)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 1, embedding: embeddingB },
          { index: 0, embedding: embeddingA },
        ],
      }),
    })

    const result = await embedAiActTexts(['alpha', 'beta'])
    expect(result).toEqual([embeddingA, embeddingB])
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'mistral-embed',
          input: ['alpha', 'beta'],
        }),
      })
    )
  })

  test('extractAiActFileText lit un markdown sans OCR', async () => {
    const text = await extractAiActFileText(Buffer.from('# Titre'), 'notes.md')
    expect(text).toBe('# Titre')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('extractAiActFileText utilise l\'OCR Mistral pour un PDF', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        pages: [{ markdown: 'Article 5' }, { markdown: 'Article 6' }],
      }),
    })

    const text = await extractAiActFileText(Buffer.from('pdf'), 'regulation.pdf')
    expect(text).toBe('Article 5\n\nArticle 6')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/ocr',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
