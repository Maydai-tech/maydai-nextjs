'use client'

import Image from 'next/image'
import { Lightbulb, Smartphone, Tv } from 'lucide-react'
import { getProviderIcon } from '@/lib/provider-icons'
import {
  INCOMPATIBLE_TEXT_ONLY_LABEL,
  computeEquivalenceMetrics,
  type ComputedImpactResult,
  type EcoImpactModel,
  type EquivalenceMetrics,
} from '@/lib/impact-environnemental'
import {
  formatEquivalence,
  type EquivalenceFormatKind,
} from '../utils/format-equivalence'

interface FaceToFaceCardsProps {
  modelA: EcoImpactModel
  modelB: EcoImpactModel
  impactA: ComputedImpactResult
  impactB: ComputedImpactResult
}

interface CardConfig {
  key: keyof EquivalenceMetrics
  title: string
  pedagogicalSubtitle: string
  formatKind: EquivalenceFormatKind
  Icon: typeof Smartphone
}

const CARDS: CardConfig[] = [
  {
    key: 'smartphoneRecharges',
    title: 'Recharge smartphone',
    pedagogicalSubtitle: 'Batterie de 0 à 100% (env. 15Wh)',
    formatKind: 'recharge',
    Icon: Smartphone,
  },
  {
    key: 'ledMinutes',
    title: 'Ampoule LED (9 W)',
    pedagogicalSubtitle: 'Modèle standard (9W)',
    formatKind: 'minutes',
    Icon: Lightbulb,
  },
  {
    key: 'netflixMinutes',
    title: 'Streaming Netflix',
    pedagogicalSubtitle: 'Streaming en qualité HD',
    formatKind: 'minutes',
    Icon: Tv,
  },
]

const WINNER_VALUE_CLASS = 'text-3xl font-extrabold tracking-tight text-[#0080A3]'
const LOSER_VALUE_CLASS = 'text-3xl font-extrabold tracking-tight text-slate-800'
const NA_VALUE_CLASS = 'text-sm font-semibold text-amber-800 text-center leading-snug'

function getMetricValue(
  impact: ComputedImpactResult,
  key: keyof EquivalenceMetrics
): number | null {
  if (impact.status === 'incompatible_multimodal') return null
  return computeEquivalenceMetrics(impact.energyWh)[key]
}

interface VersusColumnProps {
  model: EcoImpactModel
  value: number | null
  isWinner: boolean
  formatKind: EquivalenceFormatKind
}

function VersusColumn({ model, value, isWinner, formatKind }: VersusColumnProps) {
  const isNa = value === null
  const formatted = value !== null ? formatEquivalence(value, formatKind) : null

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <Image
        src={getProviderIcon(model.modelProvider)}
        alt=""
        width={28}
        height={28}
        className="rounded-sm object-contain"
        aria-hidden
      />
      {isNa || !formatted ? (
        <p className={NA_VALUE_CLASS}>{INCOMPATIBLE_TEXT_ONLY_LABEL}</p>
      ) : (
        <>
          <p className={isWinner ? WINNER_VALUE_CLASS : LOSER_VALUE_CLASS}>{formatted.value}</p>
          <p className="text-xs font-medium text-slate-500 text-center">{formatted.unit}</p>
        </>
      )}
      <p className="text-xs text-slate-400 text-center truncate max-w-full px-1">
        {model.modelName}
      </p>
    </div>
  )
}

export default function FaceToFaceCards({
  modelA,
  modelB,
  impactA,
  impactB,
}: FaceToFaceCardsProps) {
  return (
    <section aria-labelledby="face-to-face-section" className="mt-8">
      <h2 id="face-to-face-section" className="text-lg font-semibold text-slate-900 mb-2">
        Équivalences vie quotidienne
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Impact traduit en repères du quotidien. Le chiffre en bleu MaydAI indique le modèle au
        meilleur bilan énergétique (valeur la plus basse).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CARDS.map(({ key, title, pedagogicalSubtitle, formatKind, Icon }) => {
          const valueA = getMetricValue(impactA, key)
          const valueB = getMetricValue(impactB, key)
          const naA = valueA === null
          const naB = valueB === null

          let winner: 'a' | 'b' | null = null
          if (!naA && !naB && valueA !== valueB) {
            winner = valueA < valueB ? 'a' : 'b'
          }

          return (
            <article
              key={key}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <header className="flex flex-col items-center gap-3 text-center px-2 pt-2 pb-1">
                <Icon className="w-8 h-8 text-[#0080A3] mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-slate-600 font-medium text-sm">{title}</h3>
                <span className="text-xs text-slate-500 font-normal mt-1">
                  {pedagogicalSubtitle}
                </span>
              </header>

              <div
                className="flex justify-between items-center gap-4 mt-4 pb-4 border-b border-slate-100"
                role="group"
                aria-label={`${title} — comparaison ${modelA.modelName} versus ${modelB.modelName}`}
              >
                <VersusColumn
                  model={modelA}
                  value={valueA}
                  isWinner={winner === 'a'}
                  formatKind={formatKind}
                />

                <div className="w-px h-12 bg-slate-200 shrink-0 self-center" aria-hidden />

                <VersusColumn
                  model={modelB}
                  value={valueB}
                  isWinner={winner === 'b'}
                  formatKind={formatKind}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
