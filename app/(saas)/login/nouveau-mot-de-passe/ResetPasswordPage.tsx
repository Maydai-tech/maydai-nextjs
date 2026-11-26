'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AUTH_PATHS, establishSessionFromUrl } from '@/lib/auth-email-links'
import { finalizePendingSignup } from '@/lib/signup-finalize'
import { HAS_PASSWORD_KEY, PASSWORD_HINT, validateNewPassword } from '@/lib/password-policy'
import PasswordInput from '@/components/auth/PasswordInput'
import AuthShell, { AuthLoading, AUTH_LINK_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from '@/components/auth/AuthShell'

export default function ResetPasswordPage() {
  const router = useRouter()
  const startedRef = useRef(false)
  const [session, setSession] = useState<Session | null>(null)
  const [linkError, setLinkError] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Le jeton du lien n'est utilisable qu'une fois (StrictMode monte deux fois en dev).
    if (startedRef.current) return
    startedRef.current = true
    establishSessionFromUrl().then((result) => {
      if (result.session) setSession(result.session)
      else setLinkError(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateNewPassword(password, confirmation)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { [HAS_PASSWORD_KEY]: true } })
    if (updateError) {
      setSaving(false)
      const code = (updateError as { code?: string }).code
      setError(
        code === 'same_password'
          ? 'Choisissez un mot de passe différent de l’actuel.'
          : code === 'weak_password'
            ? 'Mot de passe trop faible. Choisissez-en un plus long.'
            : 'Enregistrement impossible. Le lien a peut-être expiré : demandez-en un nouveau.'
      )
      return
    }
    // Un lien de réinitialisation confirme aussi l'email : finaliser une inscription restée en attente.
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      await finalizePendingSignup(data.session).catch((err) => console.error('[reset-password] Finalisation inscription', err))
    }
    router.push('/dashboard/registries')
  }

  const newLinkFooter = (
    <div className="mt-6 text-center">
      <p className="text-sm text-gray-600">
        Lien expiré ?{' '}
        <Link href={AUTH_PATHS.forgotPassword} className={AUTH_LINK_CLASS}>
          Demander un nouveau lien
        </Link>
      </p>
    </div>
  )

  if (linkError) {
    return (
      <AuthShell title="Lien invalide ou expiré">
        <p className="text-gray-700 text-center">
          Ce lien ne permet plus de choisir un mot de passe. Il a peut-être expiré, déjà été utilisé, ou été ouvert
          dans un autre navigateur que celui de la demande.
        </p>
        {newLinkFooter}
      </AuthShell>
    )
  }

  if (!session) return <AuthLoading />

  return (
    <AuthShell title="Choisissez votre mot de passe" subtitle={<p className="font-medium">{session.user.email}</p>}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        <PasswordInput
          id="new-password"
          label="Nouveau mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={PASSWORD_HINT}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirmer le mot de passe"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
        />
        <button type="submit" disabled={saving} aria-busy={saving} className={AUTH_PRIMARY_BUTTON_CLASS}>
          Enregistrer et me connecter
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
      {newLinkFooter}
    </AuthShell>
  )
}
