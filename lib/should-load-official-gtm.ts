import { headers } from 'next/headers'

/** Hôtes considérés comme la prod « officielle » (hors Vercel). */
const OFFICIAL_GTM_HOSTS = new Set(['maydai.io', 'www.maydai.io'])

/**
 * GTM uniquement sur la prod réelle : déploiement Vercel « Production » ou domaine canonique,
 * pour exclure preview (.vercel.app), localhost et next start local.
 */
export async function shouldLoadOfficialGTM(): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return false

  if (process.env.VERCEL) {
    return process.env.VERCEL_ENV === 'production'
  }

  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    return true
  }

  const headersList = await headers()
  const rawHost =
    headersList.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    headersList.get('host') ??
    ''
  const host = rawHost.split(':')[0]?.toLowerCase() ?? ''
  if (!host) return false
  return OFFICIAL_GTM_HOSTS.has(host)
}
