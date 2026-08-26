'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import EvaluationChatInterviewer from '@/components/chat/EvaluationChatInterviewer'
import { ProcessingAnimation } from '@/app/(saas)/usecases/[id]/components/ProcessingAnimation'
import { useAuth } from '@/lib/auth'
import { formatCompanySector } from '@/lib/constants/industries'
import { useCaseRoutes } from '@/app/(saas)/usecases/[id]/utils/routes'
import ChatFlowStepper from '@/app/(saas)/usecases/new/components/ChatFlowStepper'
import { CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS } from '@/lib/mistral/report-timeouts'
import {
  ASSISTANT_ENTRY_SURFACE,
  ASSISTANT_PATH_RUN_MODE,
} from '@/lib/evaluation-path-run-mode'
import { QUESTIONNAIRE_VERSION_V3, normalizeQuestionnaireVersion } from '@/lib/questionnaire-version'

export default function ChatEvaluationPage() {
  return (
    <ProtectedRoute>
      <ChatEvaluationPageContent />
    </ProtectedRoute>
  )
}

export function ChatEvaluationPageContent() {
  const params = useParams()
  const router = useRouter()
  const usecaseId = typeof params.id === 'string' ? params.id : ''
  const { session } = useAuth()
  const [industryLabel, setIndustryLabel] = useState<string | null>(null)
  const [usecaseName, setUsecaseName] = useState<string | null>(null)
  const [usecaseDescription, setUsecaseDescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showProcessingAnimation, setShowProcessingAnimation] = useState(false)
  const [reportError, setReportError] = useState('')
  const [hasExistingReport, setHasExistingReport] = useState(false)
  const [questionnaireVersion, setQuestionnaireVersion] = useState(QUESTIONNAIRE_VERSION_V3)
  const [evaluationRunId, setEvaluationRunId] = useState<string | null>(null)
  const generatingReport = useRef(false)
  const pathRunCompletedSent = useRef(false)

  useEffect(() => {
    if (!usecaseId || !session?.access_token) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/usecases/${usecaseId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Cas d’usage introuvable'
              : 'Impossible de charger le cas d’usage'
          )
        }
        const data = (await response.json()) as {
          name?: string | null
          description?: string | null
          report_generated_at?: string | null
          report_summary?: string | null
          questionnaire_version?: number | null
          companies?: { industry?: string | null; sub_category_id?: string | null }
        }
        if (cancelled) return
        setUsecaseName(typeof data.name === 'string' ? data.name : null)
        setUsecaseDescription(typeof data.description === 'string' ? data.description : null)
        setQuestionnaireVersion(normalizeQuestionnaireVersion(data.questionnaire_version))
        setHasExistingReport(
          Boolean(
            (typeof data.report_generated_at === 'string' && data.report_generated_at.trim()) ||
              (typeof data.report_summary === 'string' && data.report_summary.trim())
          )
        )
        setIndustryLabel(
          formatCompanySector(data.companies?.industry, data.companies?.sub_category_id)
        )
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [session?.access_token, usecaseId])

  useEffect(() => {
    if (!usecaseId || !session?.access_token || loading || error || hasExistingReport) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/usecases/${usecaseId}/evaluation-runs/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            path_mode: ASSISTANT_PATH_RUN_MODE,
            entry_surface: ASSISTANT_ENTRY_SURFACE,
            questionnaire_version: questionnaireVersion,
          }),
        })
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
    usecaseId,
    session?.access_token,
    loading,
    error,
    hasExistingReport,
    questionnaireVersion,
  ])

  const completePathRun = useCallback(async () => {
    if (!evaluationRunId || !session?.access_token || pathRunCompletedSent.current) return
    pathRunCompletedSent.current = true
    try {
      await fetch(`/api/usecases/${usecaseId}/evaluation-runs/${evaluationRunId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })
    } catch {
      pathRunCompletedSent.current = false
    }
  }, [evaluationRunId, session?.access_token, usecaseId])

  const generateReport = useCallback(async () => {
    if (generatingReport.current) return

    if (hasExistingReport) {
      router.push(useCaseRoutes.overview(usecaseId))
      return
    }

    const token = session?.access_token
    if (!token || !usecaseId) {
      setShowProcessingAnimation(false)
      setReportError('Session expirée. Veuillez vous reconnecter.')
      return
    }

    generatingReport.current = true
    setShowProcessingAnimation(true)
    setReportError('')

    const controller = new AbortController()
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS
    )

    try {
      const response = await fetch('/api/chat/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ usecase_id: usecaseId }),
        signal: controller.signal,
      })
      let payload: { error?: string; details?: string; success?: boolean } = {}
      try {
        payload = (await response.json()) as {
          error?: string
          details?: string
          success?: boolean
        }
      } catch {
        throw new Error(
          'Le serveur n’a pas renvoyé de réponse valide. La génération a peut-être dépassé le délai.'
        )
      }
      if (!response.ok || !payload.success) {
        throw new Error(
          [payload.error || `Erreur ${response.status}`, payload.details].filter(Boolean).join(' — ')
        )
      }
      router.push(useCaseRoutes.overview(usecaseId))
    } catch (err) {
      console.error('[ChatEvaluationPage] generate-report', err)
      generatingReport.current = false
      setShowProcessingAnimation(false)
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      setReportError(
        aborted
          ? 'La génération du rapport a pris trop de temps. Vérifiez votre connexion puis réessayez.'
          : err instanceof Error
            ? err.message
            : 'Impossible de générer le rapport. Veuillez réessayer.'
      )
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [hasExistingReport, router, session?.access_token, usecaseId])

  const handlePathComplete = useCallback(async () => {
    await completePathRun()
    await generateReport()
  }, [completePathRun, generateReport])

  return (
    <div className="min-h-screen bg-gray-50">
      <ProcessingAnimation isVisible={showProcessingAnimation} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={useCaseRoutes.companies()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#0080A3]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux registres
        </Link>
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Évaluation conversationnelle</h1>
        <p className="mb-4 text-sm text-gray-600">
          L’assistant discute ; le moteur V3 choisit la prochaine question et enregistre les
          réponses catalogue.
        </p>
        <ChatFlowStepper current={3} />

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#0080A3]" />
              <p className="text-gray-600">Chargement du contexte…</p>
            </div>
          </div>
        ) : error || !usecaseId ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error || 'Identifiant de cas d’usage manquant.'}
          </div>
        ) : (
          <>
            {reportError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p>{reportError}</p>
                <button
                  type="button"
                  onClick={() => void generateReport()}
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#0080A3] px-4 text-sm font-medium text-white hover:bg-[#006280]"
                >
                  Relancer la génération du rapport
                </button>
              </div>
            )}
            <EvaluationChatInterviewer
              usecaseId={usecaseId}
              industryLabel={industryLabel || 'non renseigné'}
              usecaseName={usecaseName}
              usecaseDescription={usecaseDescription}
              onPathComplete={handlePathComplete}
            />
          </>
        )}
      </div>
    </div>
  )
}
