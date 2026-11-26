'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AUTH_PATHS, authRedirectUrl, establishSessionFromUrl, isAuthRateLimited } from '@/lib/auth-email-links'
import { finalizePendingSignup } from '@/lib/signup-finalize'
import AuthShell, { AuthLoading, EmailField, AUTH_LINK_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from '@/components/auth/AuthShell'

type Status = 'loading' | 'link-error' | 'profile-error'

export default function SignupConfirmationPage() {
  const router = useRouter()
  const startedRef = useRef(false)
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [profileError, setProfileError] = useState('')
  const [email, setEmail] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate-limited'>('idle')

  const finalize = useCallback(
    async (current: Session) => {
      setStatus('loading')
      try {
        await finalizePendingSignup(current)
        router.refresh()
        router.push('/dashboard/registries')
      } catch (err) {
        console.error('[signup-confirmation] Complete signup', err)
        setProfileError(err instanceof Error ? err.message : 'Erreur lors de la création du profil')
        setStatus('profile-error')
      }
    },
    [router]
  )

  useEffect(() => {
    // Le jeton du lien n'est utilisable qu'une fois (StrictMode monte deux fois en dev).
    if (startedRef.current) return
    startedRef.current = true
    establishSessionFromUrl().then((result) => {
      if (!result.session) {
        setStatus('link-error')
        return
      }
      setSession(result.session)
      void finalize(result.session)
    })
  }, [finalize])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendState('sending')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl(AUTH_PATHS.confirmSignup) },
    })
    setResendState(error ? (isAuthRateLimited(error) ? 'rate-limited' : 'error') : 'sent')
  }

  if (status === 'loading') return <AuthLoading label="Création de votre compte..." />

  if (status === 'profile-error' && session) {
    return (
      <AuthShell title="Création du compte interrompue">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{profileError}</p>
        </div>
        <button type="button" onClick={() => void finalize(session)} className={AUTH_PRIMARY_BUTTON_CLASS}>
          Réessayer
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Lien de confirmation invalide">
      <div className="space-y-4 text-gray-700">
        <p>Ce lien a expiré ou a déjà été utilisé.</p>
        <p className="text-sm">
          Si vous l&apos;avez ouvert sur un autre appareil ou navigateur, votre adresse est peut-être déjà confirmée :{' '}
          <Link href="/login" className={AUTH_LINK_CLASS}>
            connectez-vous
          </Link>
          .
        </p>
      </div>
      {resendState === 'sent' ? (
        <p className="mt-6 text-sm font-medium text-[#0080A3]">
          Un nouvel email de confirmation a été envoyé à {email.trim()}.
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleResend}>
          <EmailField value={email} onChange={setEmail} />
          {resendState === 'error' && <p role="alert" className="text-sm text-red-600">Envoi impossible. Veuillez réessayer.</p>}
          {resendState === 'rate-limited' && (
            <p role="alert" className="text-sm text-amber-700">Trop de demandes. Réessayez d’ici quelques minutes.</p>
          )}
          <button type="submit" disabled={resendState === 'sending' || !email.trim()} className={AUTH_PRIMARY_BUTTON_CLASS}>
            Renvoyer l&apos;email de confirmation
          </button>
        </form>
      )}
    </AuthShell>
  )
}
