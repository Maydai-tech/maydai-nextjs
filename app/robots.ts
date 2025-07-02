import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.maydai.io'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
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
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/login/',
          '/signup/',
          '/profil/',
          '/usecases/',
          '/companies/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
} 