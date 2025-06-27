import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // En développement (localhost), autoriser toutes les pages
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       request.nextUrl.hostname === 'localhost' ||
                       request.nextUrl.hostname === '127.0.0.1';

  if (isDevelopment) {
    return NextResponse.next();
  }

  // Pages du site vitrine autorisées (publiques) en production
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
  ];

  // Autoriser les fichiers statiques et les API routes
  const isStaticFile = pathname.startsWith('/_next/') || 
                      pathname.startsWith('/api/') ||
                      pathname.includes('.');

  // Si c'est un fichier statique, laisser passer
  if (isStaticFile) {
    return NextResponse.next();
  }

  // Si la page n'est pas dans la liste des pages autorisées, rediriger vers 404
  if (!allowedPaths.includes(pathname)) {
    // Rediriger vers une URL qui déclenchera la page 404
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  return NextResponse.next();
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