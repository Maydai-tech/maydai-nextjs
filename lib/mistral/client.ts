import { Mistral } from '@mistralai/mistralai'

let cached: { apiKey: string; client: Mistral } | null = null

/**
 * Client officiel `@mistralai/mistralai` (embeddings RAG, OCR, agents.complete).
 * Réutilise une instance tant que `MISTRAL_API_KEY` ne change pas.
 */
export function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Clé API Mistral manquante. Vérifiez MISTRAL_API_KEY')
  }

  if (!cached || cached.apiKey !== apiKey) {
    cached = { apiKey, client: new Mistral({ apiKey }) }
  }

  return cached.client
}

/** Réservé aux tests unitaires. */
export function resetMistralClient(): void {
  cached = null
}
