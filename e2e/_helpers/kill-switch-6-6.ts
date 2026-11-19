/**
 * Règle d'architecture 6.6 — Kill-Switch E2E.
 * Interdit d'exécuter la suite tracking contre la base Supabase de production.
 *
 * Configure dans `.env.local` :
 *   E2E_PRODUCTION_SUPABASE_URL=https://<ref-prod>.supabase.co
 */
function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '').toLowerCase()
}

function collectSupabaseEnvUrls(): string[] {
  return [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ].filter((value): value is string => Boolean(value?.trim()))
}

/**
 * Lance une erreur si une URL Supabase cible la production documentée.
 */
export function assertE2eKillSwitchNotProductionSupabase(): void {
  const productionUrl = process.env.E2E_PRODUCTION_SUPABASE_URL?.trim()
  const runtimeUrls = collectSupabaseEnvUrls()

  if (!productionUrl) {
    throw new Error(
      '[E2E Kill-Switch 6.6] E2E_PRODUCTION_SUPABASE_URL must be set in .env.local to guard against accidental production runs.',
    )
  }

  const forbidden = normalizeSupabaseUrl(productionUrl)

  for (const url of runtimeUrls) {
    if (normalizeSupabaseUrl(url) === forbidden) {
      throw new Error(
        `[E2E Kill-Switch 6.6] SUPABASE_URL points to production (${forbidden}). Aborting tracking suite.`,
      )
    }
  }

  const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').toLowerCase()
  if (baseUrl.includes('www.maydai.io') && !baseUrl.includes('preprod')) {
    throw new Error(
      '[E2E Kill-Switch 6.6] PLAYWRIGHT_BASE_URL targets production www.maydai.io. Aborting tracking suite.',
    )
  }
}
