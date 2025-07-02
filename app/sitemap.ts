import { MetadataRoute } from 'next'

// Base URL de votre site en production
const baseUrl = 'https://www.maydai.io'

// Pages publiques du site vitrine (synchronisées avec middleware.ts)
const publicPages = [
  '/',
  '/a-propos',
  '/conditions-generales',
  '/contact',
  '/fonctionnalites',
  '/ia-act-ue',
  '/ia-act-ue/calendrier',
  '/ia-act-ue/risques',
  '/politique-confidentialite',
  '/tarifs',
]

export default function sitemap(): MetadataRoute.Sitemap {
  // Pages statiques du site vitrine
  const staticPages = publicPages.map((page) => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: getChangeFrequency(page),
    priority: getPriority(page),
  }))

  // TODO: Ajouter ici vos articles de blog dynamiques si vous en avez
  // const blogPosts = await getBlogPosts()
  // const blogUrls = blogPosts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: new Date(post.updatedAt),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }))

  return [
    ...staticPages,
    // ...blogUrls, // Décommenter quand vous aurez des articles
  ]
}

// Fonction pour déterminer la fréquence de changement selon la page
function getChangeFrequency(path: string): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
  switch (path) {
    case '/':
      return 'weekly' // Page d'accueil mise à jour régulièrement
    case '/contact':
      return 'monthly' // Informations de contact stables
    case '/ia-act-ue':
    case '/ia-act-ue/calendrier':
    case '/ia-act-ue/risques':
      return 'monthly' // Contenu réglementaire mis à jour périodiquement
    case '/tarifs':
      return 'monthly' // Tarifs peuvent changer
    case '/fonctionnalites':
      return 'weekly' // Fonctionnalités évoluent avec le produit
    case '/conditions-generales':
    case '/politique-confidentialite':
      return 'yearly' // Documents légaux changent rarement
    default:
      return 'monthly'
  }
}

// Fonction pour déterminer la priorité selon la page
function getPriority(path: string): number {
  switch (path) {
    case '/':
      return 1.0 // Page d'accueil = priorité maximale
    case '/contact':
    case '/tarifs':
    case '/fonctionnalites':
      return 0.9 // Pages importantes pour la conversion
    case '/a-propos':
    case '/ia-act-ue':
      return 0.8 // Pages de contenu principal
    case '/ia-act-ue/calendrier':
    case '/ia-act-ue/risques':
      return 0.7 // Sous-pages importantes
    case '/conditions-generales':
    case '/politique-confidentialite':
      return 0.3 // Pages légales = priorité faible
    default:
      return 0.5
  }
} 