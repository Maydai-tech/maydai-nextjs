'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { StepByStepQuestionnaire } from '../components/evaluation/StepByStepQuestionnaire'
import { EvaluationQuestionnaire } from '../components/evaluation/EvaluationQuestionnaire'
import { EvaluationDebugger } from '../components/debug/EvaluationDebugger'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'

export default function UseCaseEvaluationPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { goToOverview } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')
  
  // Check if any responses have been saved
  const { formattedAnswers, loading: loadingResponses } = useQuestionnaireResponses(useCaseId)
  const hasAnySavedResponses = Object.keys(formattedAnswers || {}).length > 0

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auth redirect - OPTIMISÉ avec des dépendances précises
  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [mounted, loading, user, router])

  const handleQuestionnaireComplete = () => {
    goToOverview()
  }

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData || loadingResponses) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage n'a pas pu être chargé."}
          </p>
          <button
            onClick={goToOverview}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Retour à l'aperçu
          </button>
        </div>
      </div>
    )
  }

  // Si aucune réponse n'a été sauvegardée, afficher le questionnaire question par question en pleine page
  if (!hasAnySavedResponses) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <StepByStepQuestionnaire 
            useCase={useCase} 
            onComplete={handleQuestionnaireComplete}
          />
        </div>
      </div>
    )
  }

  // Si des réponses existent, afficher toutes les questions avec possibilité de modification
  return (
    <UseCaseLayout useCase={useCase}>
      <EvaluationQuestionnaire 
        useCase={useCase} 
        onComplete={handleQuestionnaireComplete}
        isReadOnly={false}
      />
      <EvaluationDebugger useCase={useCase} />
    </UseCaseLayout>
  )
} 