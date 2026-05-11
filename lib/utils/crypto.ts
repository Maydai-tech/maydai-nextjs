/**
 * Normalise l’email (trim + minuscules) puis calcule SHA-256 via Web Crypto.
 * À utiliser côté client uniquement (`window.crypto.subtle`).
 */
export async function hashEmailForGoogleAds(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return ''

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return ''
  }

  const data = new TextEncoder().encode(normalized)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
  const hashBytes = new Uint8Array(hashBuffer)
  let hex = ''
  for (let i = 0; i < hashBytes.length; i++) {
    hex += hashBytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
