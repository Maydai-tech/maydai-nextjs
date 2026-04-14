'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react'
import { useCaseRoutes } from '../utils/routes'

const cardBase =
  'relative flex flex-col text-left rounded-xl border-2 p-6 transition-all focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3]'
const cardInactive = 'bg-white border-gray-200 text-gray-600 hover:border-[#0080A3]'
const cardActive = 'border-[#0080A3] bg-blue-50/30 ring-1 ring-[#0080A3] text-gray-900'

export default function SelectEvaluationPathPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [selected, setSelected] = useState<'short' | 'long'>('long')
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = () => {
    setIsLoading(true)
    if (selected === 'short') {
      router.push(useCaseRoutes.evaluationShort(id))
    } else {
      router.push(useCaseRoutes.evaluation(id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 pt-12 flex flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-14 w-14 shrink-0 text-green-600" aria-hidden />
          <h1 id="path-selection-title" className="text-2xl font-semibold text-gray-900">
            Cas d&apos;usage enregistré. Choisissez votre mode d&apos;évaluation.
          </h1>
        </header>

        <div
          role="radiogroup"
          aria-label="Choix du mode d'évaluation"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <button
            type="button"
            role="radio"
            aria-checked={selected === 'short'}
            tabIndex={0}
            onClick={() => setSelected('short')}
            className={`${cardBase} ${selected === 'short' ? cardActive : cardInactive}`}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Zap className="h-6 w-6 shrink-0 text-[#0080A3]" aria-hidden />
                <span className="text-lg font-semibold text-gray-900">Parcours Court</span>
              </div>
              <span className="inline-flex shrink-0 items-center text-sm text-gray-500">
                <Clock className="mr-1 inline h-4 w-4" aria-hidden /> ~4 min
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Première évaluation de votre système d&apos;IA. Idéal pour identifier rapidement votre niveau de
              classification et vos risques majeurs selon l&apos;AI Act.
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selected === 'long'}
            tabIndex={0}
            onClick={() => setSelected('long')}
            className={`${cardBase} ${selected === 'long' ? cardActive : cardInactive}`}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck className="h-6 w-6 shrink-0 text-[#0080A3]" aria-hidden />
                <span className="text-lg font-semibold text-gray-900">Parcours Complet</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded px-2 py-1 text-xs font-semibold bg-teal-100 text-teal-800">Recommandé</span>
                <span className="inline-flex items-center text-sm text-gray-500">
                  <Clock className="mr-1 inline h-4 w-4" aria-hidden /> ~10 min
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Analyse exhaustive de toutes vos obligations légales. Fortement conseillé pour garantir la conformité de
              vos cas d&apos;usage critiques et générer un rapport complet.
            </p>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center mt-8 pt-6 border-t border-gray-100 gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Retour Dashboard
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            aria-busy={isLoading}
            className="flex w-full sm:w-auto items-center justify-center px-6 py-2 bg-[#0080A3] hover:bg-[#006280] text-white text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3]"
          >
            {isLoading ? 'Chargement…' : "Démarrer l'évaluation"}
          </button>
        </div>
      </div>
    </div>
  )
}
