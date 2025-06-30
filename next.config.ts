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
  // Les headers de sécurité sont maintenant gérés par le middleware
  // avec des nonces dynamiques pour le CSP
  
  // Désactiver l'optimisation automatique des fonts qui cause des problèmes avec les headers
  optimizeFonts: false,
  
  // Configuration des headers pour éviter les problèmes de caractères non-ASCII
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ],
      },
    ]
  }
};

export default nextConfig;
