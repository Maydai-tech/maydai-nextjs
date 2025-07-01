import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateNonce, createCSPHeader } from '@/lib/csp-nonce';
import { getAuthStatus } from '@/lib/middleware-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Générer un nonce unique pour cette requête
  const nonce = generateNonce()

  // Autoriser les fichiers statiques et les API routes en premier
  const isStaticFile = pathname.startsWith('/_next/') || 
                      pathname.startsWith('/api/') ||
                      pathname.includes('.')

  // Si c'est un fichier statique, laisser passer immédiatement
  if (isStaticFile) {
    const response = NextResponse.next();
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // Middleware d'authentification désactivé - utilise l'authentification côté client

  // En développement, autoriser toutes les pages
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       request.nextUrl.hostname === 'localhost' ||
                       request.nextUrl.hostname === '127.0.0.1';

  // En production, vérifier les pages autorisées
  if (!isDevelopment) {
    const allowedPaths = [
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
      '/login',
      '/signup',
      '/dashboard',
      '/usecases',
      '/companies',
      '/admin',
      '/profil',
    ];

    // Si la page n'est pas dans la liste des pages autorisées, rediriger vers 404
    if (!allowedPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
  }

  // Créer la réponse avec les headers de sécurité
  const response = NextResponse.next();
  
  // Ajouter le nonce aux headers
  response.headers.set('x-nonce', nonce);
  
  // En production, ajouter les headers de sécurité avec le nonce
  if (!isDevelopment) {
    response.headers.set('Content-Security-Policy', createCSPHeader(nonce));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // IMPORTANT: Supprimer les headers Link problématiques générés par Next.js
    response.headers.delete('link');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 