/**
 * Capture persistante des paramètres d’attribution (clics ads + UTM)
 * pour les parcours hors formulaire natif (ex. inscription directe sur le site).
 */

export const ATTRIBUTION_STORAGE_KEY = 'maydai_acquisition_v1'
export const ATTRIBUTION_COOKIE_NAME = 'maydai_acquisition_v1'
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90 // 90 jours

const CLICK_PARAM_KEYS = ['gclid', 'fbclid', 'msclkid', 'ttclid'] as const
const UTM_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export type StoredAttribution = {
  click_id: string | null
  /** GCLID explicite (Google Ads) ; peut coexister avec d’autres click ids dans `click_id`. */
  gclid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  captured_at: string
}

function emptyAttribution(): StoredAttribution {
  return {
    click_id: null,
    gclid: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    captured_at: new Date().toISOString(),
  }
}

function trimOrNull(v: string | null): string | null {
  if (v == null) return null
  const t = v.trim()
  return t.length ? t : null
}

/** Extrait les paramètres d’attribution depuis une query string ou un URLSearchParams. */
export function parseAttributionFromSearchParams(
  params: URLSearchParams | string
): Partial<StoredAttribution> {
  const sp = typeof params === 'string' ? new URLSearchParams(params) : params
  const out: Partial<StoredAttribution> = {}

  for (const key of CLICK_PARAM_KEYS) {
    const v = trimOrNull(sp.get(key))
    if (v) {
      out.click_id = v
      break
    }
  }

  const gclidOnly = trimOrNull(sp.get('gclid'))
  if (gclidOnly) {
    out.gclid = gclidOnly
  }

  for (const key of UTM_PARAM_KEYS) {
    const v = trimOrNull(sp.get(key))
    if (v) {
      if (key === 'utm_source') out.utm_source = v
      if (key === 'utm_medium') out.utm_medium = v
      if (key === 'utm_campaign') out.utm_campaign = v
    }
  }

  if (
    out.click_id ||
    out.gclid ||
    out.utm_source ||
    out.utm_medium ||
    out.utm_campaign
  ) {
    out.captured_at = new Date().toISOString()
  }

  return out
}

/** True si au moins un signal d’attribution utile est présent. */
export function hasMeaningfulAttribution(
  a: Partial<StoredAttribution> | StoredAttribution | null
): boolean {
  if (!a) return false
  return Boolean(
    a.click_id ||
      a.gclid ||
      a.utm_source ||
      a.utm_medium ||
      a.utm_campaign
  )
}

function mergeAttribution(
  base: StoredAttribution,
  incoming: Partial<StoredAttribution>
): StoredAttribution {
  return {
    click_id: incoming.click_id ?? base.click_id,
    gclid: incoming.gclid ?? base.gclid,
    utm_source: incoming.utm_source ?? base.utm_source,
    utm_medium: incoming.utm_medium ?? base.utm_medium,
    utm_campaign: incoming.utm_campaign ?? base.utm_campaign,
    captured_at: incoming.captured_at ?? base.captured_at,
  }
}

function readFromLocalStorage(): StoredAttribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAttribution
    if (!parsed || typeof parsed !== 'object') return null
    return {
      click_id: trimOrNull(parsed.click_id as string | null),
      gclid: trimOrNull((parsed as { gclid?: string | null }).gclid ?? null),
      utm_source: trimOrNull(parsed.utm_source as string | null),
      utm_medium: trimOrNull(parsed.utm_medium as string | null),
      utm_campaign: trimOrNull(parsed.utm_campaign as string | null),
      captured_at: parsed.captured_at || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function writeCookieJson(payload: StoredAttribution): void {
  if (typeof document === 'undefined') return
  try {
    const json = encodeURIComponent(JSON.stringify(payload))
    if (json.length > 3500) {
      console.warn('[tracking] Payload attribution trop volumineux pour le cookie, localStorage seul.')
      return
    }
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${json}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`
  } catch (e) {
    console.warn('[tracking] Écriture cookie attribution:', e)
  }
}

/** Lit l’attribution fusionnée (localStorage prioritaire, sinon cookie). */
export function readStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null
  const fromLs = readFromLocalStorage()
  if (fromLs && hasMeaningfulAttribution(fromLs)) return fromLs

  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`))
    if (!match) return null
    const value = decodeURIComponent(match.split('=').slice(1).join('='))
    const parsed = JSON.parse(value) as StoredAttribution
    if (!parsed || typeof parsed !== 'object') return null
    return {
      click_id: trimOrNull(parsed.click_id as string | null),
      gclid: trimOrNull((parsed as { gclid?: string | null }).gclid ?? null),
      utm_source: trimOrNull(parsed.utm_source as string | null),
      utm_medium: trimOrNull(parsed.utm_medium as string | null),
      utm_campaign: trimOrNull(parsed.utm_campaign as string | null),
      captured_at: parsed.captured_at || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Fusionne avec l’existant et persiste localStorage + cookie. */
export function persistAttributionMerge(
  incoming: Partial<StoredAttribution>
): StoredAttribution | null {
  if (typeof window === 'undefined') return null
  if (!hasMeaningfulAttribution(incoming)) return readStoredAttribution()

  const previous = readStoredAttribution() ?? emptyAttribution()
  const merged = mergeAttribution(previous, incoming)

  if (!hasMeaningfulAttribution(merged)) return null

  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged))
  } catch (e) {
    console.warn('[tracking] localStorage attribution:', e)
  }
  writeCookieJson(merged)
  return merged
}

/** Lit l’URL courante et persiste les paramètres pertinents. */
export function captureAttributionFromCurrentUrl(): StoredAttribution | null {
  if (typeof window === 'undefined') return null
  const parsed = parseAttributionFromSearchParams(window.location.search)
  return persistAttributionMerge(parsed)
}

export function clearStoredAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}
