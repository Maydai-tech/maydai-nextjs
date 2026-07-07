'use client'

import { Lightbulb, Layers, Smartphone, Tv } from 'lucide-react'
import {
  INCOMPATIBLE_TEXT_ONLY_LABEL,
  computeEquivalenceMetrics,
  formatImpactNumber,
  type ComputedImpactResult,
  type EquivalenceMetrics,
} from '@/lib/impact-environnemental'
import KpiHelpTooltip from './KpiHelpTooltip'

interface SavingsEquivalenceCardsProps {
  modelAName: string
  modelBName: string
  impactA: ComputedImpactResult
  impactB: ComputedImpactResult
}

interface CardConfig {
  key: keyof EquivalenceMetrics
  title: string
  valueSuffix: string
  Icon: typeof Smartphone
}

const ENERGY_CARDS: CardConfig[] = [
  {
    key: 'smartphoneRecharges',
    title: 'Recharge smartphone',
    valueSuffix: 'recharges',
    Icon: Smartphone,
  },
  {
    key: 'ledMinutes',
    title: 'Ampoule LED (9 W)',
    valueSuffix: "minutes d'éclairage",
    Icon: Lightbulb,
  },
  {
    key: 'netflixMinutes',
    title: 'Streaming Netflix',
    valueSuffix: 'minutes de vidéo',
    Icon: Tv,
  },
]

const ENERGY_WIN_CLASS = 'font-bold text-[#0080A3]'
const ADPE_WIN_CLASS = 'font-bold text-amber-600'
const NEUTRAL_VALUE_CLASS = 'font-bold text-slate-600'
const NA_CLASS = 'font-semibold text-amber-800'

function formatEquivalenceValue(
  impact: ComputedImpactResult,
  metricKey: keyof EquivalenceMetrics,
  decimals: number
): string {
  if (impact.status === 'incompatible_multimodal') {
    return INCOMPATIBLE_TEXT_ONLY_LABEL
  }
  const metrics = computeEquivalenceMetrics(impact.energyWh)
  return formatImpactNumber(metrics[metricKey], decimals)
}

function valueClassForSlot(
  slot: 'a' | 'b',
  isNa: boolean,
  winnerSlot: 'a' | 'b' | null,
  metric: 'energy' | 'adpe'
): string {
  if (isNa) return NA_CLASS
  if (winnerSlot === null) return NEUTRAL_VALUE_CLASS
  if (winnerSlot !== slot) return NEUTRAL_VALUE_CLASS
  return metric === 'energy' ? ENERGY_WIN_CLASS : ADPE_WIN_CLASS
}

function resolveWinner(
  valueA: number,
  valueB: number,
  naA: boolean,
  naB: boolean
): 'a' | 'b' | null {
  if (naA && naB) return null
  if (naA) return 'b'
  if (naB) return 'a'
  if (valueA === valueB) return null
  return valueA < valueB ? 'a' : 'b'
}

function FaceToFaceValues({
  modelAName,
  modelBName,
  displayA,
  displayB,
  valueSuffix,
  naA,
  naB,
  winnerSlot,
  metric,
}: {
  modelAName: string
  modelBName: string
  displayA: string
  displayB: string
  valueSuffix: string | null
  naA: boolean
  naB: boolean
  winnerSlot: 'a' | 'b' | null
  metric: 'energy' | 'adpe'
}) {
  return (
    <p className="text-sm text-slate-700 leading-relaxed">
      <span className="font-semibold text-slate-900">{modelAName}</span>
      {' = '}
      <span className={valueClassForSlot('a', naA, winnerSlot, metric)}>{displayA}</span>
      {!naA && valueSuffix ? ` ${valueSuffix}` : null}
      <span className="mx-2 text-slate-300" aria-hidden>
        |
      </span>
      <span className="font-semibold text-slate-900">{modelBName}</span>
      {' = '}
      <span className={valueClassForSlot('b', naB, winnerSlot, metric)}>{displayB}</span>
      {!naB && valueSuffix ? ` ${valueSuffix}` : null}
    </p>
  )
}

export default function SavingsEquivalenceCards({
  modelAName,
  modelBName,
  impactA,
  impactB,
}: SavingsEquivalenceCardsProps) {
  const naA = impactA.status === 'incompatible_multimodal'
  const naB = impactB.status === 'incompatible_multimodal'

  const energyWinner = resolveWinner(
    impactA.energyWh,
    impactB.energyWh,
    naA,
    naB
  )

  const adpeWinner = resolveWinner(impactA.adpe, impactB.adpe, naA, naB)

  const adpeDisplayA = naA ? INCOMPATIBLE_TEXT_ONLY_LABEL : formatImpactNumber(impactA.adpe)
  const adpeDisplayB = naB ? INCOMPATIBLE_TEXT_ONLY_LABEL : formatImpactNumber(impactB.adpe)

  return (
    <section aria-labelledby="equivalence-section" className="mt-8 space-y-8">
      <div>
        <h2 id="equivalence-section" className="text-lg font-semibold text-slate-900 mb-2">
          Équivalences vie quotidienne
        </h2>
        <p className="text-sm text-slate-500">
          Comparaisons face-à-face par indicateur. Les valeurs en couleur indiquent le meilleur
          impact (plus faible).
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-sky-100 p-4 bg-sky-50/30">
        <div className="flex flex-wrap items-center gap-x-1">
          <h3 className="text-sm font-semibold text-[#0080A3]">Énergie</h3>
          <KpiHelpTooltip
            tooltipId="tooltip-energie-equiv"
            ariaLabel="Définition de l’indicateur Énergie"
            description="Consommation électrique directe (GPU/CPU) pendant le traitement."
          />
          <p className="w-full text-xs text-slate-500 mt-1">
            Traduction de la consommation (Wh) en équivalents du quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {ENERGY_CARDS.map(({ key, title, valueSuffix, Icon }) => {
            const decimals = key === 'smartphoneRecharges' ? 2 : 1
            const displayA = formatEquivalenceValue(impactA, key, decimals)
            const displayB = formatEquivalenceValue(impactB, key, decimals)

            return (
              <div
                key={key}
                className="flex flex-col gap-4 p-6 border border-slate-200 rounded-lg bg-white shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col items-center gap-2 text-sm font-medium text-slate-800 shrink-0 sm:min-w-[10rem] py-1">
                  <Icon className="w-12 h-12 text-[#0080A3]" strokeWidth={1.75} aria-hidden />
                  <span className="text-center">{title}</span>
                </div>
                <FaceToFaceValues
                  modelAName={modelAName}
                  modelBName={modelBName}
                  displayA={displayA}
                  displayB={displayB}
                  valueSuffix={valueSuffix}
                  naA={naA}
                  naB={naB}
                  winnerSlot={energyWinner}
                  metric="energy"
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-amber-100 p-4 bg-amber-50/30">
        <div className="flex flex-wrap items-center gap-x-1">
          <h3 className="text-sm font-semibold text-amber-700">Métaux Rares (ADPe)</h3>
          <KpiHelpTooltip
            tooltipId="tooltip-adpe-equiv"
            ariaLabel="Définition de l’indicateur Métaux Rares (ADPe)"
            description="Impact matériel (métaux rares) de la fabrication des serveurs, rapporté à l'usage."
          />
          <p className="w-full text-xs text-slate-500 mt-1">
            Épuisement des ressources abiotiques (kg Sb eq) pour le cas d&apos;usage sélectionné.
          </p>
        </div>

        <div className="flex flex-col gap-4 p-6 border border-slate-200 rounded-lg bg-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-2 text-sm font-medium text-slate-800 shrink-0 sm:min-w-[10rem] py-1">
            <Layers className="w-12 h-12 text-[#0080A3]" strokeWidth={1.75} aria-hidden />
            <span className="text-center">Impact matériel (ADPe)</span>
          </div>
          <FaceToFaceValues
            modelAName={modelAName}
            modelBName={modelBName}
            displayA={adpeDisplayA}
            displayB={adpeDisplayB}
            valueSuffix="kg Sb eq"
            naA={naA}
            naB={naB}
            winnerSlot={adpeWinner}
            metric="adpe"
          />
        </div>
      </div>
    </section>
  )
}
