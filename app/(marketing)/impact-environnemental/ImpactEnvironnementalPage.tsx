'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, ArrowRight } from 'lucide-react'
import { SIGNUP_HREF } from '@/lib/signup-utm-hrefs'
import HeroEco from './components/HeroEco'
import AverageKpiBanner from './components/AverageKpiBanner'
import UseCasePillSelector from './components/UseCasePillSelector'
import ModelSelectDropdown from './components/ModelSelectDropdown'
import ImpactRelativeGauges from './components/ImpactRelativeGauges'
import FaceToFaceCards from './components/FaceToFaceCards'
import MethodologySection from './components/MethodologySection'
import FaqEnvironnement from './components/FaqEnvironnement'
import {
  type EcoImpactModel,
  type EquivalenceMetrics,
  type UseCaseId,
  DEFAULT_IMPACT_MODEL_A_NAME,
  DEFAULT_IMPACT_MODEL_B_NAME,
  USE_CASE_DEFINITIONS,
  computeImpactForModelWithCompatibility,
} from '@/lib/impact-environnemental'

interface ImpactEnvironnementalPageProps {
  models: EcoImpactModel[]
  fetchError: string | null
  averageMetrics: EquivalenceMetrics
}

function findModelIdByName(models: EcoImpactModel[], modelName: string): string | null {
  return models.find((m) => m.modelName === modelName)?.id ?? null
}

function pickDefaultIds(models: EcoImpactModel[]): {
  modelAId: string
  modelBId: string
} {
  if (models.length === 0) {
    return { modelAId: '', modelBId: '' }
  }
  if (models.length === 1) {
    return { modelAId: models[0].id, modelBId: models[0].id }
  }

  const modelAId =
    findModelIdByName(models, DEFAULT_IMPACT_MODEL_A_NAME) ?? models[0].id
  const modelBId =
    findModelIdByName(models, DEFAULT_IMPACT_MODEL_B_NAME) ??
    models.find((m) => m.id !== modelAId)?.id ??
    modelAId

  return { modelAId, modelBId }
}

export default function ImpactEnvironnementalPage({
  models,
  fetchError,
  averageMetrics,
}: ImpactEnvironnementalPageProps) {
  const defaults = useMemo(() => pickDefaultIds(models), [models])

  const [modelAId, setModelAId] = useState(defaults.modelAId)
  const [modelBId, setModelBId] = useState(defaults.modelBId)
  const [useCaseId, setUseCaseId] = useState<UseCaseId>('email')
  const [isCalculating, setIsCalculating] = useState(false)
  const hasShownComparisonRef = useRef(false)

  useEffect(() => {
    setModelAId(defaults.modelAId)
    setModelBId(defaults.modelBId)
  }, [defaults.modelAId, defaults.modelBId])

  const modelA = useMemo(
    () => models.find((m) => m.id === modelAId) ?? null,
    [models, modelAId]
  )
  const modelB = useMemo(
    () => models.find((m) => m.id === modelBId) ?? null,
    [models, modelBId]
  )

  const useCase = useMemo(
    () => USE_CASE_DEFINITIONS.find((u) => u.id === useCaseId) ?? USE_CASE_DEFINITIONS[0],
    [useCaseId]
  )

  const impactA = useMemo(
    () => (modelA ? computeImpactForModelWithCompatibility(modelA, useCase) : null),
    [modelA, useCase]
  )
  const impactB = useMemo(
    () => (modelB ? computeImpactForModelWithCompatibility(modelB, useCase) : null),
    [modelB, useCase]
  )

  const hasModels = models.length > 0
  const canCompare = Boolean(modelA && modelB && impactA && impactB)

  useLayoutEffect(() => {
    if (!canCompare) {
      setIsCalculating(false)
      hasShownComparisonRef.current = false
      return
    }

    if (!hasShownComparisonRef.current) {
      hasShownComparisonRef.current = true
      return
    }

    setIsCalculating(true)
    const timer = window.setTimeout(() => setIsCalculating(false), 200)
    return () => window.clearTimeout(timer)
  }, [modelAId, modelBId, useCaseId, canCompare])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <HeroEco />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-8 sm:pb-12 pt-8 sm:pt-10">
        <div className="mb-8 sm:mb-10">
          <AverageKpiBanner metrics={averageMetrics} />
        </div>

        {fetchError ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            Impossible de charger les modèles : {fetchError}
          </div>
        ) : null}

        {!fetchError && !hasModels ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Aucun modèle avec données écologiques pour la région FRA. Vérifiez la synchronisation
            EcoLogits.
          </div>
        ) : null}

        <section
          aria-labelledby="simulateur-controls"
          className="mb-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
        >
          <h2 id="simulateur-controls" className="text-2xl font-bold text-slate-900 mb-2">
            Comparateur d&apos;empreinte LLM
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Simulez l&apos;impact de vos choix d&apos;architecture. Sélectionnez un cas d&apos;usage
            et comparez deux modèles de langage (LLM) pour identifier le plus sobre
            énergétiquement.
          </p>

          <div className="mb-8">
            <p className="text-xs font-medium text-slate-600 mb-2">
              1. Définissez votre cas d&apos;usage
            </p>
            <UseCasePillSelector
              useCases={USE_CASE_DEFINITIONS}
              value={useCaseId}
              onChange={setUseCaseId}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              2. Comparez l&apos;impact de deux modèles
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <ModelSelectDropdown
                label="Modèle A (référence)"
                models={models}
                value={modelAId}
                onChange={setModelAId}
                disabled={!hasModels}
              />
              <ModelSelectDropdown
                label="Modèle B (comparaison)"
                models={models}
                value={modelBId}
                onChange={setModelBId}
                disabled={!hasModels}
              />
            </div>
          </div>
        </section>

        {canCompare ? (
          <>
            <section
              aria-labelledby="comparison-section"
              aria-busy={isCalculating}
              aria-live="polite"
              className={`rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition-opacity duration-200 ${
                isCalculating
                  ? 'opacity-50 pointer-events-none'
                  : 'opacity-100'
              }`}
            >
              <h2 id="comparison-section" className="text-lg font-semibold text-slate-900">
                Comparaison des impacts
              </h2>
              <p className="text-sm text-slate-500 mt-1 mb-2">
                Cas « {useCase.label} » — jauges relatives avec badge de gain sur le modèle le plus
                sobre.
              </p>
              <ImpactRelativeGauges
                modelA={{
                  model: modelA!,
                  impact: impactA!,
                }}
                modelB={{
                  model: modelB!,
                  impact: impactB!,
                }}
              />
            </section>

            <FaceToFaceCards
              modelA={modelA!}
              modelB={modelB!}
              impactA={impactA!}
              impactB={impactB!}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            Sélectionnez deux modèles pour afficher la comparaison.
          </p>
        )}

        <aside className="mt-8 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">Note méthodologique</p>
          <p>
            Ces calculs (basés sur{' '}
            <a
              href="https://ecologits.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0080A3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] rounded-sm transition-colors"
            >
              EcoLogits
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            ) mesurent l&apos;empreinte physique (fabrication ADPe et usage électrique) au niveau
            du datacenter du fournisseur, en proportionnalité stricte des tokens. Le cas Vision
            (~1500 tokens, multiplicateur ×1,5) ne s&apos;applique qu&apos;aux modèles avec capacité
            Vision en base ; les modèles texte-only affichent N/A.
          </p>
        </aside>

        <hr className="my-12 w-full border-0 border-t border-slate-200 dark:border-slate-600" />

        <div className="max-w-4xl mx-auto mt-12 bg-gradient-to-r from-[#0080A3]/10 to-sky-50 rounded-xl p-8 text-center border border-[#0080A3]/20">
          <span className="inline-block bg-white text-[#0080A3] text-xs font-semibold px-3 py-1 rounded-full border border-[#0080A3]/20 mb-4 shadow-sm">
            Plateforme MaydAI
          </span>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Passez de la simulation à l&apos;action
          </h3>
          <p className="text-slate-600 mb-6 max-w-lg mx-auto">
            Réalisez un audit de conformité IA Act complet et intégrez ces métriques d&apos;impact
            directement dans votre registre de traitements.
          </p>
          <a
            href={SIGNUP_HREF.impact_environnemental}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#0080A3] hover:bg-[#006682] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 shadow-sm"
          >
            Démarrer mon essai gratuit
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </a>
        </div>

        <MethodologySection />
      </main>

      <FaqEnvironnement />
    </div>
  )
}
