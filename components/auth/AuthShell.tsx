import Image from 'next/image'
import { Mail } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

/** Gabarit commun des pages d'authentification (logo, titre, carte). */
export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Image
            src="/logos/logo-maydai/logo-maydai-complet.png"
            alt="MaydAI Logo"
            width={200}
            height={50}
            className="w-auto mb-6 mx-auto"
            priority
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">{title}</h1>
          {subtitle && <div className="mt-2 text-gray-600 break-words">{subtitle}</div>}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

export function AuthLoading({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  )
}

export const AUTH_PRIMARY_BUTTON_CLASS =
  'w-full bg-[#0080A3] text-white py-3 px-4 rounded-lg font-medium transition-colors hover:bg-[#006280] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0080A3] flex items-center justify-center gap-2'

export const AUTH_LINK_CLASS = 'font-medium text-[#0080A3] hover:text-[#006280] transition-colors'

export function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
        Email
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
          placeholder="votre@email.com"
        />
      </div>
    </div>
  )
}
