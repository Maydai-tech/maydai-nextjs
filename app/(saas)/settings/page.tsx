import type { Metadata } from 'next'
import { Suspense } from 'react'
import SettingsPage from './SettingsPage'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

function SettingsFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Chargement...</p>
      </div>
    </div>
  )
}

export default function Settings() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsPage />
    </Suspense>
  )
}
