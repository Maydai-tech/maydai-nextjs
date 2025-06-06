'use client'

import { useAuth } from '@/lib/auth'

export default function GlobalLoader() {
  const { loading } = useAuth()

  if (!loading) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0080A3]"></div>
        <p className="mt-6 text-gray-600 text-lg">Chargement de Maydai...</p>
        <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#0080A3] rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
} 