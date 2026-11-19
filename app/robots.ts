import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // On retire /_next/ et les pages privées pour que Google puisse voir nos consignes "noindex"
      disallow: ['/api/'],
    },
    sitemap: 'https://www.maydai.io/sitemap.xml',
  }
}
