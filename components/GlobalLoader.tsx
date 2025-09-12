'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

interface GlobalLoaderProps {
  children: React.ReactNode
}

export default function GlobalLoader({ children }: GlobalLoaderProps) {
  const { loading } = useAuth()
  const [forceShow, setForceShow] = useState(false)

  // Force l'affichage après 3 secondes pour éviter un blocage infini
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceShow(true)
      console.warn('GlobalLoader: Force affichage après timeout - problème de connexion Supabase détecté')
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // Debug: Log the loading state
  useEffect(() => {
    console.log('GlobalLoader: loading =', loading, 'forceShow =', forceShow)
  }, [loading, forceShow])

  if (loading && !forceShow) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0080A3]"></div>
          <p className="mt-6 text-gray-600 text-lg">Chargement de MaydAI...</p>
          <div className="mt-4 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#0080A3] rounded-full animate-pulse"></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Tentative de connexion à Supabase...</p>
          <p className="mt-2 text-xs text-gray-400">Si le chargement persiste, la page s'affichera automatiquement</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 