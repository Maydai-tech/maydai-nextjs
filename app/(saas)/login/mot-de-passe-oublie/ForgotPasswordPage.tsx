'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AUTH_PATHS, authRedirectUrl, isAuthRateLimited } from '@/lib/auth-email-links'
import AuthShell, { EmailField, AUTH_LINK_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from '@/components/auth/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const sendLink = async () => {
    setError('')
    setSending(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectUrl(AUTH_PATHS.resetPassword),
    })
    setSending(false)
    // GoTrue ne révèle pas l'existence du compte : seule une erreur technique empêche l'écran « envoyé ».
    if (resetError) {
      setError(
        isAuthRateLimited(resetError)
          ? 'Trop de demandes. Réessayez d’ici quelques minutes.'
          : 'Envoi impossible. Veuillez réessayer.'
      )
      return
    }
    setSent(true)
  }

  const backLink = (
    <div className="mt-6 text-center">
      <Link href="/login" className={`text-sm ${AUTH_LINK_CLASS}`}>
        ← Retour à la connexion
      </Link>
    </div>
  )

  if (sent) {
    return (
      <AuthShell title="Consultez votre boîte mail">
        <div className="text-center space-y-4">
          <MailCheck className="h-12 w-12 text-[#0080A3] mx-auto" aria-hidden="true" />
          <p className="text-gray-700 break-words">
            Si un compte existe pour <strong>{email.trim()}</strong>, vous recevrez un lien pour choisir votre mot de
            passe. Il est valable 1 heure.
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <p className="text-sm text-gray-600">
            Rien reçu ?{' '}
            <button type="button" onClick={sendLink} disabled={sending} className={`${AUTH_LINK_CLASS} underline disabled:opacity-50`}>
              Renvoyer l&apos;email
            </button>
          </p>
        </div>
        {backLink}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Créer ou réinitialiser votre mot de passe"
      subtitle={<p>Nous vous envoyons un lien par email.</p>}
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          void sendLink()
        }}
      >
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        <EmailField value={email} onChange={setEmail} />
        <button type="submit" disabled={sending || !email.trim()} aria-busy={sending} className={AUTH_PRIMARY_BUTTON_CLASS}>
          Recevoir le lien
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
      {backLink}
    </AuthShell>
  )
}
