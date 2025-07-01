import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function getAuthStatus(request: NextRequest) {
  try {
    // Extraire le project_ref de l'URL Supabase
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]
    const authCookieName = `sb-${projectRef}-auth-token`
    
    console.log('Checking auth for path:', request.nextUrl.pathname)
    console.log('Looking for cookie:', authCookieName)
    
    // Vérifier si le cookie d'auth existe
    const authCookie = request.cookies.get(authCookieName)
    console.log('Auth cookie found:', !!authCookie?.value)
    
    if (!authCookie?.value) {
      console.log('No auth cookie found, user not authenticated')
      return { isAuthenticated: false, user: null }
    }
    
    // Créer un client Supabase pour le serveur avec support des cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = request.cookies.get(name)?.value
            return value
          },
          set() {
            // Ne pas définir de cookies dans le middleware
          },
          remove() {
            // Ne pas supprimer de cookies dans le middleware
          },
        },
      }
    )

    // Vérifier la session utilisateur avec getUser() (recommandé pour le serveur)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('Auth check result:', { 
      user: !!user, 
      userId: user?.id?.substring(0, 8) + '...', 
      error: error?.message 
    })
    
    if (error || !user) {
      return { isAuthenticated: false, user: null }
    }

    return { isAuthenticated: true, user }
  } catch (error) {
    console.error('Error checking auth in middleware:', error)
    return { isAuthenticated: false, user: null }
  }
}