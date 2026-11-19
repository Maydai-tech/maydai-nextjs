'use client'

import { Mail, Lock } from 'lucide-react'

interface ReadOnlyEmailBlockProps {
  userEmail?: string
  isVerified?: boolean
}

export default function ReadOnlyEmailBlock({
  userEmail,
  isVerified = false,
}: ReadOnlyEmailBlockProps) {
  const displayEmail = userEmail?.trim() || '—'

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Mail size={18} className="text-[#0080A3]" aria-hidden="true" />
        Adresse e-mail du compte
      </h3>
      <p className="text-sm text-gray-500 mt-1" id="email-description">
        Votre identifiant unique de connexion et de facturation.
      </p>

      <div
        className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-3"
        aria-readonly="true"
        aria-describedby="email-description"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Lock size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
          <span className="text-gray-700 font-medium truncate">{displayEmail}</span>
        </div>
        {isVerified && (
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium shrink-0 ml-3">
            Vérifiée
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Pour des raisons de sécurité, cette adresse n&apos;est pas modifiable directement.{' '}
        <a
          href="mailto:support@maydai.io"
          className="text-[#0080A3] hover:underline focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:outline-none rounded px-1"
        >
          Contactez le support
        </a>{' '}
        pour la changer.
      </p>
    </div>
  )
}
