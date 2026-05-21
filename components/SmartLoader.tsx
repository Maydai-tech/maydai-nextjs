'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useState, useEffect } from 'react'

interface SmartLoaderProps {
  children: React.ReactNode
}

/** Délai max avant retrait de l'overlay auth (évite UI figée si Supabase ne répond pas). */
const SAFETY_TIMEOUT_MS = 5000

export default function SmartLoader({ children }: SmartLoaderProps) {
  const pathname = usePathname()
  const { loading } = useAuth()
  const [forceShow, setForceShow] = useState(false)

  // Pages publiques qui n'ont pas besoin d'authentification
  const publicPages = [
    '/',
    '/a-propos',
    '/contact',
    '/tarifs',
    '/fonctionnalites',
    '/ia-act-ue',
    '/conditions-generales',
    '/politique-confidentialite',
    '/success'
  ]

  const isPublicPage = publicPages.some(page => pathname === page || pathname.startsWith(page))

  // Timeout de sécurité au montage : force l'affichage même si loading reste true indéfiniment
  useEffect(() => {
    if (isPublicPage) return

    const timer = setTimeout(() => {
      setForceShow(true)
      console.warn(
        `[SmartLoader] Timeout sécurité (${SAFETY_TIMEOUT_MS}ms) — overlay retiré (loading=${loading})`
      )
    }, SAFETY_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [isPublicPage, loading])

  useEffect(() => {
    if (!loading) {
      setForceShow(true)
    }
  }, [loading])

  // Pour les pages publiques, ne pas bloquer l'affichage
  if (isPublicPage) {
    return <>{children}</>
  }

  // Pour les pages privées, afficher le loader pendant l'authentification
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
