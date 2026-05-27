import { Lightbulb, Smartphone, Tv } from 'lucide-react'
import type { EquivalenceMetrics } from '@/lib/impact-environnemental'
import {
  formatEquivalence,
  type EquivalenceFormatKind,
} from '../utils/format-equivalence'

interface AverageKpiBannerProps {
  metrics: EquivalenceMetrics
}

interface KpiCardConfig {
  key: keyof EquivalenceMetrics
  title: string
  subtitle: string
  formatKind: EquivalenceFormatKind
  Icon: typeof Smartphone
}

const KPI_CARDS: KpiCardConfig[] = [
  {
    key: 'smartphoneRecharges',
    title: 'Recharge smartphone',
    subtitle: 'Batterie de 0 à 100 % (env. 12 Wh)',
    formatKind: 'recharge',
    Icon: Smartphone,
  },
  {
    key: 'ledMinutes',
    title: 'Ampoule LED (9 W)',
    subtitle: 'Modèle standard (9 W)',
    formatKind: 'minutes',
    Icon: Lightbulb,
  },
  {
    key: 'netflixMinutes',
    title: 'Streaming Netflix',
    subtitle: 'Streaming en qualité HD',
    formatKind: 'minutes',
    Icon: Tv,
  },
]

export default function AverageKpiBanner({ metrics }: AverageKpiBannerProps) {
  return (
    <section
      aria-labelledby="average-kpi-heading"
      className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
    >
      <div className="bg-sky-50 border-l-4 border-[#0080A3] p-4 mb-6 rounded-r-md text-sm text-slate-700 flex gap-3 items-start">
        <Lightbulb
          className="w-5 h-5 text-[#0080A3] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <strong
            id="average-kpi-heading"
            className="block font-semibold text-slate-900 mb-1"
          >
            Le saviez-vous ?
          </strong>
          La génération d&apos;un article standard (environ 2 000 tokens) a un impact physique
          réel. Les équivalences ci-dessous représentent la moyenne de consommation constatée sur{' '}
          <strong>39 modèles de langage (LLM)</strong> évalués selon le référentiel EcoLogits.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KPI_CARDS.map(({ key, title, subtitle, formatKind, Icon }) => {
          const formatted = formatEquivalence(metrics[key], formatKind)
          return (
            <article
              key={key}
              className="flex flex-col items-center text-center rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-5"
            >
              <Icon className="w-8 h-8 text-[#0080A3] mx-auto mb-3" aria-hidden="true" />
              <strong className="text-sm font-semibold text-slate-900">{title}</strong>
              <p className="text-xs text-slate-500 mt-1 mb-3">{subtitle}</p>
              <p className="text-2xl font-extrabold text-[#0080A3] tracking-tight">
                {formatted.value}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">{formatted.unit}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
