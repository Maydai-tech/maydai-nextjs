/**
 * Limiteur de débit en mémoire (fenêtre fixe).
 * ponytail: compteur par instance, remis à zéro au redémarrage. Suffit pour freiner
 * l'énumération sur un conteneur unique ; passer à un stockage partagé (Redis, table)
 * si l'app tourne sur plusieurs instances ou si la limite doit être stricte.
 */
const hits = new Map<string, { count: number; resetAt: number }>()
const MAX_KEYS = 5000

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = hits.get(key)
  if (!entry || entry.resetAt <= now) {
    if (hits.size >= MAX_KEYS) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
      if (hits.size >= MAX_KEYS) hits.clear()
    }
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

/** Première adresse de `x-forwarded-for` (posée par le proxy), sinon `unknown`. */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}
