/**
 * Chemin Storage d'une preuve de dossier.
 * Accepte :
 * - une URL publique historique .../object/public/dossiers/<path>
 * - une URL signée .../object/sign/dossiers/<path>
 * - le chemin relatif déjà stocké : companyId/usecaseId/docType/fichier
 */

const STORAGE_URL_PATH = /\/storage\/v1\/object\/(?:public|sign)\/dossiers\/(.+)/

function sanitizeRelativePath(path: string): string | null {
  const normalized = path.replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\\') || normalized.includes('://')) {
    return null
  }
  const segments = normalized.split('/')
  if (segments.length < 2 || segments.some((segment) => segment.length === 0)) {
    return null
  }
  return normalized
}

export function extractDossierStoragePath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null
  const trimmed = fileUrl.trim()
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\')) return null

  if (trimmed.includes('://')) {
    try {
      const match = new URL(trimmed).pathname.match(STORAGE_URL_PATH)
      if (!match?.[1]) return null
      return sanitizeRelativePath(decodeURIComponent(match[1]))
    } catch {
      return null
    }
  }

  try {
    return sanitizeRelativePath(decodeURIComponent(trimmed))
  } catch {
    return null
  }
}
