/** Identifiants de colonnes Google Lead Form (user_column_data[].column_id). */
export const GOOGLE_LEAD_FORM_COLUMN_ID_EMAIL = 'EMAIL'
const COLUMN_ID_FIRST_NAME = 'FIRST_NAME'
const COLUMN_ID_LAST_NAME = 'LAST_NAME'
const COLUMN_ID_PHONE_NUMBER = 'PHONE_NUMBER'
const COLUMN_ID_COMPANY_NAME = 'COMPANY_NAME'

type GoogleUserColumnRow = {
  column_id?: string
  string_value?: string
}

type GoogleAdsWebhookBody = {
  gclid?: unknown
  campaign_id?: unknown
  campaign_name?: unknown
  ad_group_name?: unknown
  user_column_data?: unknown
  [key: string]: unknown
}

/** Objet aligné sur l’insert Supabase `public.leads` (hors id, timestamps, etc.). */
export type GoogleAdsLeadInsertPayload = {
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  company_name: string | null
  gclid: string | null
  campaign_name: string | null
  ad_group_name: string | null
  source: 'google_ads_form'
}

function toTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const t = value.trim()
    return t.length ? t : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

/**
 * Parcourt `user_column_data` (payload officiel Google : `{ column_id, string_value, ... }[]`)
 * et retient la première `string_value` non vide pour chaque `column_id`.
 */
function valuesByColumnIdFromUserColumnData(
  rows: GoogleUserColumnRow[]
): Map<string, string> {
  const byId = new Map<string, string>()
  for (const row of rows) {
    if (typeof row.column_id !== 'string' || !row.column_id.trim()) continue
    const value = toTrimmedString(row.string_value)
    if (!value) continue
    const id = row.column_id
    if (!byId.has(id)) byId.set(id, value)
  }
  return byId
}

function firstNonNull(...candidates: (string | null)[]): string | null {
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') return c
  }
  return null
}

/**
 * Extrait les champs formulaire depuis `user_column_data` (recherche par `column_id`)
 * et les champs marketing à la racine du JSON et/ou dans les query params de l’URL.
 */
export function extractGoogleLeadFields(
  raw: unknown,
  urlSearchParams: URLSearchParams
): GoogleAdsLeadInsertPayload {
  const rowsUnknown = (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as GoogleAdsWebhookBody).user_column_data)
      ? (raw as GoogleAdsWebhookBody).user_column_data
      : []
  ) as unknown[]

  const rows: GoogleUserColumnRow[] = rowsUnknown.filter(
    (r): r is GoogleUserColumnRow =>
      r !== null && typeof r === 'object' && !Array.isArray(r)
  )

  const byColumnId = valuesByColumnIdFromUserColumnData(rows)

  const root =
    raw && typeof raw === 'object' ? (raw as GoogleAdsWebhookBody) : null

  const gclid = firstNonNull(
    root ? toTrimmedString(root.gclid) : null,
    toTrimmedString(urlSearchParams.get('gclid'))
  )

  const campaign_name = firstNonNull(
    root ? toTrimmedString(root.campaign_name) : null,
    toTrimmedString(urlSearchParams.get('campaign_name')),
    root && root.campaign_id !== undefined && root.campaign_id !== null
      ? String(root.campaign_id)
      : null,
    toTrimmedString(urlSearchParams.get('campaign_id'))
  )

  const ad_group_name = firstNonNull(
    root ? toTrimmedString(root.ad_group_name) : null,
    toTrimmedString(urlSearchParams.get('ad_group_name'))
  )

  return {
    email: byColumnId.get(GOOGLE_LEAD_FORM_COLUMN_ID_EMAIL) ?? null,
    first_name: byColumnId.get(COLUMN_ID_FIRST_NAME) ?? null,
    last_name: byColumnId.get(COLUMN_ID_LAST_NAME) ?? null,
    phone: byColumnId.get(COLUMN_ID_PHONE_NUMBER) ?? null,
    company_name: byColumnId.get(COLUMN_ID_COMPANY_NAME) ?? null,
    gclid,
    campaign_name,
    ad_group_name,
    source: 'google_ads_form',
  }
}
