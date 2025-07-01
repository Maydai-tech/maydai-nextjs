import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function getAuthStatus(request: NextRequest) {
  try {
    // Log pour debug
    console.log('Checking auth for path:', request.nextUrl.pathname)
    
    // Créer un client Supabase pour le serveur avec support des cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = request.cookies.get(name)?.value
            console.log(`Cookie ${name}:`, value ? 'exists' : 'missing')
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

    // Vérifier la session utilisateur
    const { data: { user }, error } = await supabase.auth.getUser()
    
    console.log('Auth check result:', { user: !!user, error: error?.message })
    
    if (error || !user) {
      return { isAuthenticated: false, user: null }
    }

    return { isAuthenticated: true, user }
  } catch (error) {
    console.error('Error checking auth in middleware:', error)
    return { isAuthenticated: false, user: null }
  }
}