import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/** Pages publiques du parcours mot de passe (cibles des liens envoyés par email). */
export const AUTH_PATHS = {
  forgotPassword: '/login/mot-de-passe-oublie',
  resetPassword: '/login/nouveau-mot-de-passe',
  confirmSignup: '/signup/confirmation',
} as const

export function authRedirectUrl(path: string): string {
  return `${window.location.origin}${path}`
}

/** 429 / quotas d'envoi GoTrue. */
export function isAuthRateLimited(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const { status, code } = err as { status?: number; code?: string }
  return status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit'
}

export type UrlSessionResult = { session: Session; error: null } | { session: null; error: string }

/**
 * Établit la session depuis un lien email Supabase, quel que soit le flux :
 * - `?token_hash=&type=` → verifyOtp (fonctionne sur n'importe quel appareil) ;
 * - `?code=` → déjà échangé par supabase-js si le code_verifier PKCE est présent (même navigateur),
 *   sinon exchangeCodeForSession (échoue si le lien est ouvert sur un autre navigateur) ;
 * - `#access_token=` (flux implicite) → déjà détecté par supabase-js au démarrage.
 */
export async function establishSessionFromUrl(): Promise<UrlSessionResult> {
  const url = new URL(window.location.href)
  const query = url.searchParams
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const tokenHash = query.get('token_hash')
  const type = query.get('type')
  const code = query.get('code')

  let session: Session | null = null
  let errorMessage: string | null = query.get('error_description') || hash.get('error_description')

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
    session = data?.session ?? null
    if (error) errorMessage = error.message
  } else {
    // getSession attend l'initialisation du client (détection PKCE / implicite automatique).
    const { data } = await supabase.auth.getSession()
    session = data.session
    if (!session && code) {
      const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code)
      session = exchanged?.session ?? null
      if (error) errorMessage = error.message
    }
  }

  // Ne pas rejouer un jeton déjà consommé si l'utilisateur recharge la page.
  if (tokenHash || code || url.hash) window.history.replaceState(null, '', url.pathname)

  if (session) return { session, error: null }
  return { session: null, error: errorMessage || 'Lien invalide ou expiré.' }
}
