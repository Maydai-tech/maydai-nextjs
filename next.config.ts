import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Désactive ESLint pendant le build de production
    ignoreDuringBuilds: true,
  },
  // Disable static optimization for pages that use search params
  trailingSlash: false,
  // Retire output: 'standalone' pour le développement
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  
  // Configuration expérimentale pour optimiser les CSS
  experimental: {
    optimizePackageImports: [],
    // Désactivé temporairement pour éviter les problèmes avec Next.js 15
    // cssChunking: 'strict',
  },
  
  // Ajout des redirections
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.png',
        permanent: true, // Redirection 301
      },
      // Redirections pour éviter les doublons de contenu
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  async headers() {
    // En développement, utilisez des en-têtes plus permissifs
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            // Empêcher Next.js d'ajouter des headers Link automatiques
            {
              key: 'Link',
              value: ''
            }
          ],
        },
      ];
    }
    
    // En production, utilisez les en-têtes de sécurité stricts avec support CookieYes
    return [
      {
        source: '/(.*)',
        headers: [
          // Empêche les navigateurs de deviner le type MIME
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Empêche l'affichage de la page dans une iframe
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Protection XSS intégrée du navigateur
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Contrôle des informations de référence
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Politique de sécurité du contenu mise à jour pour GTM et CookieYes
          {
            key: 'Content-Security-Policy',
            value: [
              // Source par défaut - Autoriser uniquement le domaine actuel
              "default-src 'self'",
              
              // Scripts - Autoriser GTM, CookieYes, Stripe, HubSpot et les scripts nécessaires à Next.js
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://tagmanager.google.com https://cdn-cookieyes.com https://app.cookieyes.com https://js.stripe.com https://js-eu1.hsforms.net https://js.hsforms.net https://js-eu1.hs-scripts.com https://js.hs-scripts.com https://js-eu1.hs-analytics.net https://js.hs-analytics.net https://js-eu1.hs-banner.com https://js.hs-banner.com https://js-eu1.hscollectedforms.net https://js.hscollectedforms.net",
              
              // Styles - Autoriser les styles inline (nécessaire pour Next.js et les bandeaux)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn-cookieyes.com https://app.cookieyes.com",
              
              // Images - Autoriser toutes les images HTTPS et data URIs + GA4/GTM + HubSpot tracking
              "img-src 'self' data: https: https://www.google-analytics.com https://www.googletagmanager.com https://cdn-cookieyes.com https://app.cookieyes.com https://track.hubspot.com https://track.hubspot.eu",
              
              // Connexions - Autoriser les appels API nécessaires (Supabase + GA4 + GTM + CookieYes + Stripe + HubSpot)
              "connect-src 'self' https://*.supabase.co https://api.maydai.io https://region1.google-analytics.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://cookieyes.com https://cdn-cookieyes.com https://app.cookieyes.com https://log.cookieyes.com https://api.cookieyes.com https://widget.cookieyes.com https://api.stripe.com https://api.hsforms.com https://forms.hubspot.com https://forms-eu1.hsforms.com https://forms-eu1.hscollectedforms.net https://hscollectedforms.net https://api.hubspot.com https://api.hubapi.com",
              
              // Polices - Autoriser les polices personnalisées et Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com https://cdn-cookieyes.com https://app.cookieyes.com",
              
              // Frames - Autoriser les iframes pour GTM noscript, Stripe Checkout et HubSpot
              "frame-src 'self' https://www.googletagmanager.com https://js.stripe.com https://cookieyes.com https://app.cookieyes.com https://widget.cookieyes.com https://app.hubspot.com https://app-eu1.hubspot.com https://forms-eu1.hsforms.com",
              
              // Objets - Interdire tous les objets pour la sécurité
              "object-src 'none'",
              
              // Base URI - Restreindre aux domaines sûrs
              "base-uri 'self'",
              
              // Actions de formulaire - Autoriser le domaine actuel et HubSpot
              "form-action 'self' https://forms.hubspot.com https://forms-eu1.hsforms.com https://app-eu1.hubspot.com",
              
              // Ancêtres de frame - Interdire l'intégration dans des iframes
              "frame-ancestors 'none'",
              
              // Mise à niveau forcée vers HTTPS
              "upgrade-insecure-requests"
            ]
            .join('; ') // Joindre les directives CSP avec des point-virgules
            .replace(/\s{2,}/g, ' ') // Nettoyer les espaces multiples
            .trim(), // Supprimer les espaces en début/fin
          },
          // Politique de permissions - Restreindre l'accès aux APIs sensibles
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  }
};

export default nextConfig;
