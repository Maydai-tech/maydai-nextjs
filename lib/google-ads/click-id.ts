/** Normalise un GCLID / click_id avant dédup ou envoi API. */
export function normalizeGoogleAdsClickId(clickId: string): string | null {
  const normalized = clickId.trim()
  return normalized.length > 0 ? normalized : null
}
