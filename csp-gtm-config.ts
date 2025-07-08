/**
 * Configuration CSP (Content Security Policy) pour Google Tag Manager
 * À intégrer dans votre middleware.ts ou next.config.ts
 */

export function createCSPHeaderForGTM(nonce?: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // En développement : règles plus permissives
    return [
      "default-src 'self'",
      `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} 'unsafe-eval'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' ws: wss:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
  }
  
  // En production : CSP strict avec GTM
  return [
    "default-src 'self'",
    // Scripts : domaines GTM et Analytics
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} https://www.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com`,
    // Styles : autorise inline pour GTM
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tagmanager.google.com",
    // Images : domaines de tracking Google
    "img-src 'self' data: https: https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net",
    // Connexions : APIs Analytics et GTM
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://region1.google-analytics.com",
    // Polices
    "font-src 'self' data: https://fonts.gstatic.com",
    // Frames : pour GTM preview
    "frame-src 'self' https://www.googletagmanager.com",
    // Autres directives de sécurité
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
}

/**
 * Configuration pour middleware.ts
 */
export function addGTMHeaders(response: Response, nonce: string) {
  response.headers.set('Content-Security-Policy', createCSPHeaderForGTM(nonce));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Configuration pour next.config.ts (alternative sans nonces)
 */
export const nextConfigHeaders = [
  {
    source: '/(.*)',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: createCSPHeaderForGTM()
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      }
    ]
  }
]; 