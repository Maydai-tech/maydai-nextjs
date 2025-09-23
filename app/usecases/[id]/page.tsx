'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from './hooks/useUseCaseData'
import { useUseCaseNavigation } from './utils/navigation'
import { UseCaseLayout } from './components/shared/UseCaseLayout'
import { UseCaseLoader } from './components/shared/UseCaseLoader'
import { UseCaseDetails } from './components/overview/UseCaseDetails'
import { UseCaseSidebar } from './components/overview/UseCaseSidebar'

export default function UseCaseDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  // Récupération des données du use case avec état de recalcul
  const { useCase, progress, loading: loadingData, error, updateUseCase, updating, isRecalculating } = useUseCaseData(useCaseId)
  const { goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Auto-redirect logic removed - now handled in dashboard click

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d'usage non trouvé</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès."}
          </p>
          <button
            onClick={goToCompanies}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <UseCaseLayout 
      useCase={useCase}
      onUpdateUseCase={updateUseCase}
      updating={updating}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
        <UseCaseDetails 
          useCase={useCase} 
          onUpdateUseCase={updateUseCase}
          updating={updating}
        />

        {/* Sidebar avec transmission de l'état de recalcul */}
        <UseCaseSidebar useCase={useCase} onUpdateUseCase={updateUseCase} isRecalculating={isRecalculating} />
      </div>
    </UseCaseLayout>
  )
} 