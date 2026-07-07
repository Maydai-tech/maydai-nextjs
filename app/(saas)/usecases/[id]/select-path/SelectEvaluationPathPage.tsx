'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Toast from '@/components/Toast'
import { useCaseRoutes } from '../utils/routes'

const cardBase =
  'relative flex flex-col text-left rounded-xl border-2 p-6 transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3]'
const cardStyle =
  'bg-white border-gray-200 text-gray-600 hover:border-[#0080A3] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none'

type PathMode = 'short' | 'long'

export default function SelectEvaluationPathPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { session, loading: authLoading } = useAuth()

  const inFlightRef = useRef(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingPath, setPendingPath] = useState<PathMode | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error')

  const showErrorToast = useCallback((message: string) => {
    setToastType('error')
    setToastMessage(message)
    setToastVisible(true)
  }, [])

  /**
   * Même contrat que le reste de l’app (`useUseCaseData`, header, etc.) :
   * **PUT** `/api/usecases/[id]` — il n’y a pas de route `PATCH` sur ce handler.
   */
  const persistPathMode = useCallback(
    async (pathMode: PathMode): Promise<boolean> => {
      const token = session?.access_token
      if (!token) {
        showErrorToast('Session expirée. Veuillez vous reconnecter.')
        return false
      }

      const response = await fetch(`/api/usecases/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path_mode: pathMode }),
      })

      const contentType = response.headers.get('content-type')
      let payload: { error?: string } = {}

      if (contentType?.includes('application/json')) {
        try {
          payload = await response.json()
        } catch {
          /* ignore */
        }
      }

      if (!response.ok) {
        const fallback =
          pathMode === 'short'
            ? 'Impossible d’enregistrer le parcours Express.'
            : 'Impossible d’enregistrer le parcours Complet.'
        showErrorToast(payload.error || fallback)
        return false
      }

      return true
    },
    [id, session?.access_token, showErrorToast]
  )

  /**
   * Express → `path_mode: 'short'` puis `/evaluation?parcours=court`
   * Complet → `path_mode: 'long'` puis `/evaluation`
   */
  const startEvaluation = useCallback(
    async (pathMode: PathMode) => {
      if (authLoading || inFlightRef.current) return
      inFlightRef.current = true
      setIsUpdating(true)
      setPendingPath(pathMode)
      try {
        const ok = await persistPathMode(pathMode)
        if (!ok) return

        if (pathMode === 'short') {
          router.push(useCaseRoutes.evaluationShort(id))
        } else {
          router.push(useCaseRoutes.evaluation(id))
        }
      } finally {
        inFlightRef.current = false
        setIsUpdating(false)
        setPendingPath(null)
      }
    },
    [authLoading, id, persistPathMode, router]
  )

  const controlsDisabled = isUpdating || authLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        duration={7000}
      />

      <div className="max-w-3xl mx-auto p-6 pt-12 flex flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-14 w-14 shrink-0 text-green-600" aria-hidden />
          <h1 id="path-selection-title" className="text-2xl font-semibold text-gray-900">
            Cas d&apos;usage enregistré. Choisissez votre mode d&apos;évaluation.
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            type="button"
            aria-busy={isUpdating && pendingPath === 'short'}
            disabled={controlsDisabled}
            onClick={() => void startEvaluation('short')}
            className={`${cardBase} ${cardStyle}`}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Zap className="h-6 w-6 shrink-0 text-[#0080A3]" aria-hidden />
                <span className="text-lg font-semibold text-gray-900">Parcours Express (court)</span>
              </div>
              <span className="inline-flex shrink-0 items-center text-sm text-gray-500">
                <Clock className="mr-1 inline h-4 w-4" aria-hidden /> 2 mn
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 mb-4">
              Première évaluation de votre système d&apos;IA. Idéal pour identifier rapidement votre niveau de
              classification et vos risques majeurs selon l&apos;AI Act.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#0080A3]">
              {isUpdating && pendingPath === 'short' ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Enregistrement…
                </>
              ) : (
                <>Démarrer en Express →</>
              )}
            </span>
          </button>

          <button
            type="button"
            aria-busy={isUpdating && pendingPath === 'long'}
            disabled={controlsDisabled}
            onClick={() => void startEvaluation('long')}
            className={`${cardBase} ${cardStyle}`}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck className="h-6 w-6 shrink-0 text-[#0080A3]" aria-hidden />
                <span className="text-lg font-semibold text-gray-900">Parcours Complet</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded px-2 py-1 text-xs font-semibold bg-teal-100 text-teal-800">Recommandé</span>
                <span className="inline-flex items-center text-sm text-gray-500">
                  <Clock className="mr-1 inline h-4 w-4" aria-hidden /> 6 mn
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 mb-4">
              Analyse exhaustive de toutes vos obligations légales. Fortement conseillé pour garantir la conformité de
              vos cas d&apos;usage critiques et générer un rapport complet.
            </p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#0080A3]">
              {isUpdating && pendingPath === 'long' ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Enregistrement…
                </>
              ) : (
                <>Démarrer en Complet →</>
              )}
            </span>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center mt-8 pt-6 border-t border-gray-100 gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            disabled={isUpdating}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Retour Dashboard
          </button>
          <p className="text-center text-xs text-gray-500 sm:text-right">
            Le choix est enregistré sur le cas d&apos;usage avant l&apos;ouverture du questionnaire.
          </p>
        </div>
      </div>
    </div>
  )
}
