import { z } from 'zod'

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

export const IMMUTABLE_ON_EXTERNAL_UPDATE_COLUMNS = [
  ...VEILLE_COLUMNS,
  'model_name',
  'model_provider',
  'model_provider_id',
  'slug',
  'model_type',
  'license',
  'license_class',
  'license_id',
  'license_url',
  'license_eu_restricted',
  'role',
  'reference_model_id',
  'base_model_id',
  'merged_into_id',
  'visibility_override',
  'system_card_status',
] as const

export type ImmutableOnExternalUpdateColumn = (typeof IMMUTABLE_ON_EXTERNAL_UPDATE_COLUMNS)[number]

export const EcoLogitsLinkStatusSchema = z.enum(['unmatched', 'matched', 'ignored'])

export type EcoLogitsLinkStatus = z.infer<typeof EcoLogitsLinkStatusSchema>

export function omitVeilleColumns<T extends Record<string, unknown>>(record: T): Omit<T, VeilleColumn> {
  const copy = { ...record }
  for (const column of VEILLE_COLUMNS) {
    delete copy[column]
  }
  return copy
}

export function omitImmutableExternalUpdateColumns<T extends Record<string, unknown>>(
  record: T,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...record }
  for (const column of IMMUTABLE_ON_EXTERNAL_UPDATE_COLUMNS) {
    delete copy[column]
  }
  return copy
}
