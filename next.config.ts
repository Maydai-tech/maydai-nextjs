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
  async headers() {
    // En développement, utilisez des en-têtes plus permissifs
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    
    // En production, utilisez les en-têtes de sécurité stricts
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
          // Politique de sécurité du contenu
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co",
              "font-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
          // Protection contre les attaques de sniffing MIME
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
