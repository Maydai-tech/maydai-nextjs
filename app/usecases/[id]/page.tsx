'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useUseCase } from './hooks/useUseCase'
import { UseCaseHeader } from './components/UseCaseHeader'
import { UseCaseDetails } from './components/UseCaseDetails'
import { UseCaseSidebar } from './components/UseCaseSidebar'
import { DraftQuestionnaire } from './components/questionnaire/DraftQuestionnaire'
import { ArrowLeft } from 'lucide-react'

export default function UseCaseDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const {
    useCase,
    progress,
    loading: loadingData,
    showQuestionnaire,
    setShowQuestionnaire,
    refetch
  } = useUseCase(useCaseId)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  const handleQuestionnaireComplete = () => {
    setShowQuestionnaire(false)
    refetch()
  }

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement du cas d'usage...</p>
        </div>
      </div>
    )
  }

  if (!useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cas d'usage non trouvé</h1>
          <p className="text-gray-600 mb-4">Le cas d'usage que vous recherchez n'existe pas ou vous n'y avez pas accès.</p>
          <Link
            href="/dashboard/companies"
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux entreprises
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <UseCaseHeader useCase={useCase} progress={progress} />

      {/* Show questionnaire for draft use cases */}
      {showQuestionnaire && (
        <DraftQuestionnaire 
          useCase={useCase} 
          onComplete={handleQuestionnaireComplete}
        />
      )}

      {/* Regular content - only show if not showing questionnaire */}
      {!showQuestionnaire && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <UseCaseDetails useCase={useCase} />

          {/* Sidebar */}
          <UseCaseSidebar useCase={useCase} />
        </div>
      )}
    </div>
  )
} 