/**
 * Parcours affiché (Express / Complet) ↔ colonne DB `usecases.path_mode` (short / long / null).
 * @see supabase/migrations/014_usecases_path_mode.sql
 */
export type JourneyType = 'Express' | 'Complet'

export type PathMode = 'short' | 'long' | null

export function getJourneyTypeFromPathMode(pathMode: PathMode): JourneyType {
  return pathMode === 'short' ? 'Express' : 'Complet'
}

export function getPathModeFromJourneyType(journeyType: JourneyType): 'short' | 'long' {
  return journeyType === 'Express' ? 'short' : 'long'
}

/**
 * Résolution tolérante (Postel) : priorité au `path_mode` natif, puis `journey_type` insensible à la casse.
 * `null` = défaut sûr (équivalent parcours long côté produit / héritage en base).
 */
export function resolvePathModeFromBody(payload: unknown): PathMode {
  if (payload === null || typeof payload !== 'object') {
    return null
  }

  const p = payload as Record<string, unknown>

  // 1. Priorité au champ natif de la base de données
  if (p.path_mode === 'short' || p.path_mode === 'long') {
    return p.path_mode
  }

  // 2. Tolérance sur journey_type (insensible à la casse)
  if (p.journey_type) {
    const normalizedType = String(p.journey_type).toUpperCase().trim()

    if (normalizedType === 'EXPRESS') {
      return 'short'
    }
    if (normalizedType === 'COMPLET' || normalizedType === 'COMPLETE') {
      return 'long'
    }
  }

  // 3. Fallback (rétrocompatibilité : null = long / héritage)
  return null
}

/** Indique si le client a explicitement envoyé un champ lié au parcours (pour PUT partiel). */
export function bodyHasPathModeFields(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    ('path_mode' in payload || 'journey_type' in payload)
  )
}
