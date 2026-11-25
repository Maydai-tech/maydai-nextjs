export interface PostgrestLikeError {
  message?: string | null
  details?: string | null
  hint?: string | null
  code?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function toExplicitError(context: string, error: unknown): Error {
  console.error(`[${context}]`, error)

  if (error instanceof Error) {
    return error
  }

  if (isRecord(error)) {
    const msg = typeof error.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null
    const details = typeof error.details === 'string' && error.details.trim().length > 0 ? error.details.trim() : null
    const code = typeof error.code === 'string' && error.code.trim().length > 0 ? `[${error.code}] ` : ''
    const resolved = msg || details || JSON.stringify(error)
    return new Error(`${code}${resolved}`)
  }

  return new Error(String(error || 'Erreur inconnue'))
}
