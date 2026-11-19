import { z } from 'zod'

/**
 * Normalise une valeur PostgREST / JSON vers une chaîne trimée.
 * `null`, `undefined` et types non textuels → ''.
 */
function toStrictString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  return ''
}

/**
 * Normalise vers un booléen strict (jamais `null`).
 */
function toStrictBoolean(value: unknown): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true
  }
  return false
}

/**
 * Normalise vers un nombre fini (jamais `null` / `NaN`).
 */
function toStrictNumber(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/** Champ texte tolérant aux `null` Supabase (scoring complétude, registre). */
export const strictStringField = z.preprocess(toStrictString, z.string())

/** Champ booléen tolérant aux `null` Supabase. */
export const strictBooleanField = z.preprocess(toStrictBoolean, z.boolean())

/** Champ numérique tolérant aux `null` Supabase. */
export const strictNumberField = z.preprocess(toStrictNumber, z.number())
