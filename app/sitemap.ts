import type { MetadataRoute } from 'next'

/** URL canonique — alignée sur `metadataBase` dans app/layout.tsx */
const DEFAULT_BASE_URL = 'https://www.maydai.io'

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

// Pages publiques du site vitrine (synchronisées avec middleware.ts / robots.ts)
const PUBLIC_PAGES = [
  '/',
  '/a-propos',
  '/conditions-generales',
  '/contact',
  '/fonctionnalites',
  '/ia-act-ue',
  '/ia-act-ue/calendrier',
  '/ia-act-ue/risques',
  '/conformite-ia',
  '/impact-environnemental',
  '/politique-confidentialite',
  '/tarifs',
  '/audit-ia-act',
  '/securite',
] as const

/** Dates de dernière modification connues (évite `new Date()` volatile à chaque build). */
const LAST_MODIFIED_BY_PATH: Partial<Record<(typeof PUBLIC_PAGES)[number], string>> = {
  '/audit-ia-act': '2026-05-28',
  '/conformite-ia': '2026-05-28',
  '/impact-environnemental': '2026-05-28',
}

const BUILD_LAST_MODIFIED = new Date().toISOString().slice(0, 10)

function getBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate)
    if (normalized) return normalized
  }

  return DEFAULT_BASE_URL
}

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null

  try {
    const withProtocol = value.startsWith('http') ? value : `https://${value}`
    const url = new URL(withProtocol)
    // Supprime le slash final pour éviter les doubles slash dans les entrées
    return url.origin
  } catch {
    return null
  }
}

function parseLastModified(path: (typeof PUBLIC_PAGES)[number]): Date {
  const raw = LAST_MODIFIED_BY_PATH[path] ?? BUILD_LAST_MODIFIED
  const parsed = new Date(`${raw}T12:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date(`${BUILD_LAST_MODIFIED}T12:00:00.000Z`)
  }

  return parsed
}

function getChangeFrequency(path: (typeof PUBLIC_PAGES)[number]): ChangeFrequency {
  switch (path) {
    case '/':
    case '/audit-ia-act':
    case '/conformite-ia':
    case '/impact-environnemental':
    case '/fonctionnalites':
      return 'weekly'
    case '/contact':
    case '/ia-act-ue':
    case '/ia-act-ue/calendrier':
    case '/ia-act-ue/risques':
    case '/tarifs':
    case '/securite':
      return 'monthly'
    case '/conditions-generales':
    case '/politique-confidentialite':
      return 'yearly'
    default:
      return 'monthly'
  }
}

function getPriority(path: (typeof PUBLIC_PAGES)[number]): number {
  switch (path) {
    case '/':
      return 1
    case '/contact':
    case '/tarifs':
    case '/fonctionnalites':
    case '/conformite-ia':
    case '/impact-environnemental':
      return 0.9
    case '/a-propos':
    case '/ia-act-ue':
    case '/audit-ia-act':
    case '/securite':
      return 0.8
    case '/ia-act-ue/calendrier':
    case '/ia-act-ue/risques':
      return 0.7
    case '/conditions-generales':
    case '/politique-confidentialite':
      return 0.3
    default:
      return 0.5
  }
}

function buildStaticEntries(baseUrl: string): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: page === '/' ? `${baseUrl}/` : `${baseUrl}${page}`,
    lastModified: parseLastModified(page),
    changeFrequency: getChangeFrequency(page),
    priority: getPriority(page),
  }))
}

/**
 * Point d'extension pour des routes dynamiques (blog, etc.).
 * Retourne un tableau vide si la source n'est pas disponible — ne doit jamais throw.
 */
async function fetchDynamicEntries(_baseUrl: string): Promise<MetadataRoute.Sitemap> {
  // Exemple futur :
  // try {
  //   const posts = await getBlogPosts()
  //   return posts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, ... }))
  // } catch (error) {
  //   console.error('[sitemap] dynamic entries skipped:', error)
  //   return []
  // }
  return []
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  try {
    const staticEntries = buildStaticEntries(baseUrl)
    const dynamicEntries = await fetchDynamicEntries(baseUrl)

    return [...staticEntries, ...dynamicEntries]
  } catch (error) {
    console.error('[sitemap] generation failed, returning fallback:', error)

    return [
      {
        url: `${baseUrl}/`,
        lastModified: parseLastModified('/'),
        changeFrequency: 'weekly',
        priority: 1,
      },
    ]
  }
}
