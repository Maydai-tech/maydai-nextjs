import { logger } from '@/lib/secure-logger'

const MISTRAL_API_URL = 'https://api.mistral.ai/v1'
export const MISTRAL_EMBED_MODEL = 'mistral-embed'
export const MISTRAL_EMBED_DIMENSIONS = 1024
export const MISTRAL_OCR_MODEL = 'mistral-ocr-latest'

const EMBED_BATCH_SIZE = 16

function getMistralApiKey(): string {
  const apiKey = process.env.MISTRAL_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Clé API Mistral manquante. Vérifiez MISTRAL_API_KEY')
  }
  return apiKey
}

interface MistralEmbeddingItem {
  embedding?: number[]
  index?: number
}

interface MistralEmbeddingsResponse {
  data?: MistralEmbeddingItem[]
}

interface MistralOcrPage {
  markdown?: string
  text?: string
}

interface MistralOcrResponse {
  pages?: MistralOcrPage[]
}

async function mistralFetch(path: string, body: unknown): Promise<Response> {
  const response = await fetch(`${MISTRAL_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Erreur API Mistral (RAG AI Act)', undefined, {
      path,
      status: response.status,
      details: errorText.slice(0, 500),
    })
    throw new Error(`Erreur API Mistral ${path}: ${response.status}`)
  }

  return response
}

export function assertEmbeddingDimension(embedding: number[]): number[] {
  if (embedding.length !== MISTRAL_EMBED_DIMENSIONS) {
    throw new Error(
      `Dimension d'embedding inattendue: ${embedding.length} (attendu ${MISTRAL_EMBED_DIMENSIONS})`
    )
  }
  return embedding
}

/**
 * Embeddings `mistral-embed` (1024) — même famille que le LLM conversationnel.
 */
export async function embedAiActTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE)
    const response = await mistralFetch('/embeddings', {
      model: MISTRAL_EMBED_MODEL,
      input: batch,
    })
    const payload = (await response.json()) as MistralEmbeddingsResponse
    const items = [...(payload.data ?? [])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0)
    )

    if (items.length !== batch.length) {
      throw new Error(
        `Réponse embeddings incomplète: ${items.length}/${batch.length}`
      )
    }

    for (const item of items) {
      if (!Array.isArray(item.embedding)) {
        throw new Error('Embedding Mistral manquant ou invalide')
      }
      embeddings.push(assertEmbeddingDimension(item.embedding))
    }
  }

  return embeddings
}

/**
 * Extraction de texte PDF via Mistral OCR (pas de dépendance pdf-parse / next.config).
 */
export async function extractPdfTextWithMistralOcr(pdfBuffer: Buffer): Promise<string> {
  if (pdfBuffer.length === 0) {
    throw new Error('PDF vide, extraction impossible')
  }

  const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
  const response = await mistralFetch('/ocr', {
    model: MISTRAL_OCR_MODEL,
    document: {
      type: 'document_url',
      document_url: dataUrl,
    },
  })

  const payload = (await response.json()) as MistralOcrResponse
  const text = (payload.pages ?? [])
    .map((page) => page.markdown || page.text || '')
    .join('\n\n')
    .trim()

  if (!text) {
    throw new Error('OCR Mistral: aucun texte extrait du PDF')
  }

  return text
}

export async function extractAiActFileText(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
    const text = fileBuffer.toString('utf8').trim()
    if (!text) {
      throw new Error(`Fichier texte vide: ${fileName}`)
    }
    return text
  }

  return extractPdfTextWithMistralOcr(fileBuffer)
}
