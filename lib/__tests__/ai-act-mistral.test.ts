/** @jest-environment node */

jest.mock('@/lib/secure-logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

const embeddingsCreate = jest.fn()
const ocrProcess = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    embeddings: { create: embeddingsCreate },
    ocr: { process: ocrProcess },
  }),
  resetMistralClient: jest.fn(),
}))

import {
  assertEmbeddingDimension,
  embedAiActTexts,
  extractAiActFileText,
  MISTRAL_EMBED_BATCH_SIZE,
  MISTRAL_EMBED_DIMENSIONS,
  MISTRAL_EMBED_MODEL,
} from '@/lib/ai-act-mistral'

describe('ai-act-mistral', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.MISTRAL_API_KEY = 'test-mistral-key'
  })

  test('assertEmbeddingDimension refuse une taille autre que 1024', () => {
    expect(() => assertEmbeddingDimension([0.1, 0.2])).toThrow(/1024/)
    expect(assertEmbeddingDimension(Array(MISTRAL_EMBED_DIMENSIONS).fill(0.1))).toHaveLength(1024)
  })

  test('embedAiActTexts envoie mistral-embed via le SDK et conserve l\'ordre', async () => {
    const embeddingA = Array(1024).fill(0.1)
    const embeddingB = Array(1024).fill(0.2)
    embeddingsCreate.mockResolvedValue({
      data: [
        { index: 1, embedding: embeddingB },
        { index: 0, embedding: embeddingA },
      ],
    })

    const result = await embedAiActTexts(['alpha', 'beta'])
    expect(result).toEqual([embeddingA, embeddingB])
    expect(embeddingsCreate).toHaveBeenCalledWith({
      model: MISTRAL_EMBED_MODEL,
      inputs: ['alpha', 'beta'],
      outputDimension: MISTRAL_EMBED_DIMENSIONS,
    })
  })

  test('embedAiActTexts découpe les lots selon MISTRAL_EMBED_BATCH_SIZE', async () => {
    const vec = Array(1024).fill(0.3)
    embeddingsCreate.mockImplementation(async ({ inputs }: { inputs: string[] }) => ({
      data: inputs.map((_: string, index: number) => ({ index, embedding: vec })),
    }))

    const texts = Array.from({ length: MISTRAL_EMBED_BATCH_SIZE + 2 }, (_, i) => `chunk-${i}`)
    const result = await embedAiActTexts(texts)

    expect(embeddingsCreate).toHaveBeenCalledTimes(2)
    expect(embeddingsCreate.mock.calls[0][0].inputs).toHaveLength(MISTRAL_EMBED_BATCH_SIZE)
    expect(embeddingsCreate.mock.calls[1][0].inputs).toHaveLength(2)
    expect(result).toHaveLength(texts.length)
  })

  test('extractAiActFileText lit un markdown sans OCR', async () => {
    const text = await extractAiActFileText(Buffer.from('# Titre'), 'notes.md')
    expect(text).toBe('# Titre')
    expect(ocrProcess).not.toHaveBeenCalled()
  })

  test('extractAiActFileText utilise l\'OCR Mistral pour un PDF', async () => {
    ocrProcess.mockResolvedValue({
      pages: [{ markdown: 'Article 5' }, { markdown: 'Article 6' }],
    })

    const text = await extractAiActFileText(Buffer.from('pdf'), 'regulation.pdf')
    expect(text).toBe('Article 5\n\nArticle 6')
    expect(ocrProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mistral-ocr-latest',
        document: expect.objectContaining({ type: 'document_url' }),
      })
    )
  })
})
