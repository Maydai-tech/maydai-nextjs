/** Colonnes dont la veille (bouton Appliquer) est la seule source. */
export const VEILLE_COLUMNS = [
  'lifecycle_status',
  'launch_date',
  'deprecation_date',
  'retirement_date',
  'replacement_model_id',
  'lifecycle_checked_at',
] as const

export type VeilleColumn = (typeof VEILLE_COLUMNS)[number]

export function omitVeilleColumns<T extends Record<string, unknown>>(record: T): Omit<T, VeilleColumn> {
  const copy = { ...record }
  for (const column of VEILLE_COLUMNS) {
    delete copy[column]
  }
  return copy
}
