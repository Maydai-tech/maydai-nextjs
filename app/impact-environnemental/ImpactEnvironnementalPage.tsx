'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/site-vitrine/Header'
import Footer from '@/components/site-vitrine/Footer'
import UseCasePillSelector from './components/UseCasePillSelector'
import ModelSelectDropdown from './components/ModelSelectDropdown'
import ImpactRelativeGauges from './components/ImpactRelativeGauges'
import FaceToFaceCards from './components/FaceToFaceCards'
import {
  type EcoImpactModel,
  type UseCaseId,
  USE_CASE_DEFINITIONS,
  computeImpactForModelWithCompatibility,
} from '@/lib/impact-environnemental'

interface ImpactEnvironnementalPageProps {
  models: EcoImpactModel[]
  fetchError: string | null
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
  return { modelAId: models[0].id, modelBId: models[1].id }
}

export default function ImpactEnvironnementalPage({
  models,
  fetchError,
}: ImpactEnvironnementalPageProps) {
  const defaults = useMemo(() => pickDefaultIds(models), [models])

  const [modelAId, setModelAId] = useState(defaults.modelAId)
  const [modelBId, setModelBId] = useState(defaults.modelBId)
  const [useCaseId, setUseCaseId] = useState<UseCaseId>('email')

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0080A3] mb-2">
            Simulateur
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Impact Environnemental des IA
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-2xl">
            Comparez l&apos;empreinte énergétique (Wh) et l&apos;ADPe (ng Sb eq) de deux modèles
            selon un cas d&apos;usage. Données EcoLogits — région France (FRA), base 1000 tokens.
          </p>
        </header>

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
          <h2 id="simulateur-controls" className="text-lg font-semibold text-slate-900 mb-4">
            Paramètres
          </h2>

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

          <div className="mt-6">
            <p className="text-xs font-medium text-slate-600 mb-2">Cas d&apos;usage</p>
            <UseCasePillSelector
              useCases={USE_CASE_DEFINITIONS}
              value={useCaseId}
              onChange={setUseCaseId}
            />
          </div>
        </section>

        {canCompare ? (
          <>
            <section
              aria-labelledby="comparison-section"
              className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
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
            Ces calculs (basés sur EcoLogits) mesurent l&apos;empreinte physique (fabrication ADPe
            et usage électrique) au niveau du datacenter du fournisseur, en proportionnalité
            stricte des tokens. Le cas Vision (~1500 tokens, multiplicateur ×1,5) ne s&apos;applique
            qu&apos;aux modèles avec capacité Vision en base ; les modèles texte-only affichent N/A.
          </p>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
