'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PASSWORD_HINT, validateNewPassword } from '@/lib/password-policy'
import PasswordInput from '@/components/auth/PasswordInput'

export default function PasswordChangeCard() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateNewPassword(password, confirmation)
    if (validationError) {
      setMessage({ type: 'error', text: validationError })
      return
    }
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      const code = (error as { code?: string }).code
      setMessage({
        type: 'error',
        text:
          code === 'same_password'
            ? 'Choisissez un mot de passe différent de l’actuel.'
            : code === 'weak_password'
              ? 'Mot de passe trop faible. Choisissez-en un plus long.'
              : 'Impossible de changer le mot de passe. Veuillez réessayer.',
      })
      return
    }
    setPassword('')
    setConfirmation('')
    setMessage({ type: 'success', text: 'Votre mot de passe a été modifié.' })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Lock size={18} className="text-[#0080A3]" aria-hidden="true" />
        Mot de passe
      </h3>
      <p className="text-sm text-gray-500 mt-1">Le mot de passe que vous utilisez pour vous connecter.</p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PasswordInput
            id="settings-new-password"
            label="Nouveau mot de passe"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={PASSWORD_HINT}
          />
          <PasswordInput
            id="settings-confirm-password"
            label="Confirmer le mot de passe"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />
        </div>

        {message && (
          <p
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !password || !confirmation}
          aria-busy={saving}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Changer le mot de passe
        </button>
      </form>
    </div>
  )
}
