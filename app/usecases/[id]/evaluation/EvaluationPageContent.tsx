'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { StepByStepQuestionnaire } from '../components/evaluation/StepByStepQuestionnaire'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import {
  normalizeQuestionnaireVersion,
  QUESTIONNAIRE_VERSION_V3,
} from '@/lib/questionnaire-version'
import type { QuestionnairePathMode } from '../utils/questionnaire'
import {
  trackV3ShortPathSessionStart,
  trackV3EvaluationEntrySurface,
  v3ShortPathSystemTypeBucket,
} from '@/lib/v3-short-path-analytics'

function EvaluationInner() {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const evaluationEntrySurface = searchParams.get('entree') ?? undefined
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { goToOverview } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

  const { loading: loadingResponses } = useQuestionnaireResponses(useCaseId)

  const questionnairePathMode: QuestionnairePathMode =
    normalizeQuestionnaireVersion(useCase?.questionnaire_version) === QUESTIONNAIRE_VERSION_V3 &&
    searchParams.get('parcours') === 'court'
      ? 'short'
      : 'long'

  const shortPathStartTracked = useRef(false)
  const longEvaluationEntryTracked = useRef(false)
  const [evaluationRunId, setEvaluationRunId] = useState<string | null>(null)

  useEffect(() => {
    if (!useCase || questionnairePathMode !== 'short') return
    if (shortPathStartTracked.current) return
    shortPathStartTracked.current = true
    const page_path =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined
    const referrer_excerpt =
      typeof document !== 'undefined' && document.referrer
        ? document.referrer.slice(0, 200)
        : undefined
    trackV3ShortPathSessionStart({
      usecase_id: useCase.id,
      system_type_bucket: v3ShortPathSystemTypeBucket(useCase.system_type),
      page_path,
      referrer_excerpt,
      ...(evaluationEntrySurface && { entry_surface: evaluationEntrySurface }),
    })
  }, [useCase, questionnairePathMode, evaluationEntrySurface])

  useEffect(() => {
    if (!useCase || questionnairePathMode !== 'long' || !evaluationEntrySurface) return
    if (longEvaluationEntryTracked.current) return
    longEvaluationEntryTracked.current = true
    trackV3EvaluationEntrySurface({
      usecase_id: useCase.id,
      questionnaire_version: normalizeQuestionnaireVersion(useCase.questionnaire_version),
      entry_surface: evaluationEntrySurface,
      system_type_bucket: v3ShortPathSystemTypeBucket(useCase.system_type),
    })
  }, [useCase, questionnairePathMode, evaluationEntrySurface])

  useEffect(() => {
    if (!useCase || !session?.access_token) return
    const vers = normalizeQuestionnaireVersion(useCase.questionnaire_version)
    if (questionnairePathMode === 'short' && vers !== QUESTIONNAIRE_VERSION_V3) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/usecases/${useCase.id}/evaluation-runs/start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              path_mode: questionnairePathMode,
              entry_surface: evaluationEntrySurface ?? null,
              questionnaire_version: vers,
            }),
          }
        )
        if (!res.ok) return
        const json = (await res.json()) as { run_id?: string }
        if (!cancelled && json.run_id) setEvaluationRunId(json.run_id)
      } catch {
        /* collecte best-effort */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    useCase,
    questionnairePathMode,
    evaluationEntrySurface,
    session?.access_token,
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [mounted, loading, user, router])

  const handleQuestionnaireComplete = () => {
    goToOverview()
  }

  if (!mounted || loading) {
    return <UseCaseLoader />
  }

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
            Retour à l&apos;aperçu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <StepByStepQuestionnaire
          useCase={useCase}
          onComplete={handleQuestionnaireComplete}
          questionnairePathMode={questionnairePathMode}
          evaluationRunId={evaluationRunId}
        />
      </div>
    </div>
  )
}

export function EvaluationPageContent() {
  return (
    <Suspense fallback={<UseCaseLoader message="Chargement…" />}>
      <EvaluationInner />
    </Suspense>
  )
}
