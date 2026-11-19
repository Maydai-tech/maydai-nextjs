import { getMistralClient } from '@/lib/mistral/client'
import { logger } from '@/lib/secure-logger'

export const MISTRAL_EMBED_MODEL = 'mistral-embed'
export const MISTRAL_EMBED_DIMENSIONS = 1024
export const MISTRAL_OCR_MODEL = 'mistral-ocr-latest'

/** Lots d’embeddings : 8 × ~1000 tokens reste sous la limite ~16k tokens de l’API. */
export const MISTRAL_EMBED_BATCH_SIZE = 8

export function assertEmbeddingDimension(embedding: number[]): number[] {
  if (embedding.length !== MISTRAL_EMBED_DIMENSIONS) {
    throw new Error(
      `Dimension d'embedding inattendue: ${embedding.length} (attendu ${MISTRAL_EMBED_DIMENSIONS})`
    )
  }
  return embedding
}

/**
 * Embeddings `mistral-embed` (1024) via le SDK officiel — même famille que le LLM conversationnel.
 */
export async function embedAiActTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getMistralClient()
  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += MISTRAL_EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + MISTRAL_EMBED_BATCH_SIZE)
    try {
      const response = await client.embeddings.create({
        model: MISTRAL_EMBED_MODEL,
        inputs: batch,
        outputDimension: MISTRAL_EMBED_DIMENSIONS,
      })
      const items = [...(response.data ?? [])].sort(
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
    } catch (error) {
      logger.error('Erreur API Mistral embeddings (RAG AI Act)', undefined, {
        batch_size: batch.length,
        details: error instanceof Error ? error.message : String(error),
      })
      throw error instanceof Error
        ? error
        : new Error('Erreur API Mistral embeddings')
    }
  }

  return embeddings
}

/**
 * Extraction de texte PDF via Mistral OCR (SDK officiel).
 */
export async function extractPdfTextWithMistralOcr(pdfBuffer: Buffer): Promise<string> {
  if (pdfBuffer.length === 0) {
    throw new Error('PDF vide, extraction impossible')
  }

  const documentUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
  const client = getMistralClient()

  try {
    const payload = await client.ocr.process({
      model: MISTRAL_OCR_MODEL,
      document: {
        type: 'document_url',
        documentUrl,
      },
    })

    const text = (payload.pages ?? [])
      .map((page) => page.markdown || '')
      .join('\n\n')
      .trim()

    if (!text) {
      throw new Error('OCR Mistral: aucun texte extrait du PDF')
    }

    return text
  } catch (error) {
    logger.error('Erreur API Mistral OCR (RAG AI Act)', undefined, {
      details: error instanceof Error ? error.message : String(error),
    })
    throw error instanceof Error ? error : new Error('Erreur API Mistral OCR')
  }
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
