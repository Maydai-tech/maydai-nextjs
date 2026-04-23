import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Création d'une réponse modifiable pour y injecter les futurs cookies
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mise à jour de la requête interceptée
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          // Clonage de la réponse pour y attacher les cookies rafraîchis
          supabaseResponse = NextResponse.next({
            request,
          })
          // Écriture finale vers le navigateur
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Appel crucial : Déclenche le rafraîchissement silencieux de la session si le JWT est expiré
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
