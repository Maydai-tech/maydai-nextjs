/**
 * Title Case : première lettre en majuscule, reste en minuscules, mot par mot.
 * Préserve les casses mixtes déjà intentionnelles (ex. OpenAI).
 */
export function toTitleCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  return trimmed
    .split(/(\s+)/)
    .map((token) => {
      if (token.length === 0 || /^\s+$/.test(token)) return token
      const hasLower = /[a-z]/.test(token)
      const hasUpper = /[A-Z]/.test(token)
      if (hasLower && hasUpper) return token
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
    })
    .join('')
}

export async function parseApiJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error(
      response.status === 404
        ? 'Route API introuvable.'
        : `Réponse invalide du serveur (${response.status}).`,
    )
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`Réponse invalide du serveur (${response.status}).`)
  }
}
