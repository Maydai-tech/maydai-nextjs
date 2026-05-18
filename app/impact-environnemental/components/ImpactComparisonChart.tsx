'use client'

import Image from 'next/image'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getProviderIcon } from '@/lib/provider-icons'
import {
  INCOMPATIBLE_TEXT_ONLY_LABEL,
  adpeKgToNanograms,
  formatImpactNumber,
  type ComputedImpactResult,
  type EcoImpactModel,
} from '@/lib/impact-environnemental'
import KpiHelpTooltip from './KpiHelpTooltip'

export interface ImpactChartModel {
  model: EcoImpactModel
  impact: ComputedImpactResult
}

interface ImpactComparisonChartProps {
  modelA: ImpactChartModel
  modelB: ImpactChartModel
}

type HorizontalRow = {
  /** Clé stable pour Recharts (Modèle A / Modèle B). */
  name: string
  modelName: string
  value: number
  fill: string
  slot: 'a' | 'b'
  isIncompatible: boolean
}

/** Barre de référence (Modèle A) — gris neutre uniforme. */
const REFERENCE_BAR_COLOR = '#e2e8f0'

const ENERGY_ACCENT = '#0080A3'
const ADPE_ACCENT = '#d97706'

type MetricTheme = {
  id: 'energy' | 'adpe'
  title: string
  subtitle: string
  unit: string
  accentColor: string
  headerClass: string
  sectionBorderClass: string
  definitionBorderClass: string
  tooltipId: string
  tooltipAriaLabel: string
  tooltipText: string
  definition: string
}

const ENERGY_THEME: MetricTheme = {
  id: 'energy',
  title: 'Énergie',
  subtitle: 'Consommation électrique — Wh',
  unit: 'Wh',
  accentColor: ENERGY_ACCENT,
  headerClass: 'text-[#0080A3]',
  sectionBorderClass: 'border-sky-100',
  definitionBorderClass: 'border-sky-100 bg-sky-50/50',
  tooltipId: 'tooltip-energie',
  tooltipAriaLabel: 'Définition de l’indicateur Énergie',
  tooltipText: 'Consommation électrique directe (GPU/CPU) pendant le traitement.',
  definition:
    'Consommation électrique directe liée à l\'utilisation des serveurs (GPU/CPU) pendant le traitement de votre requête.',
}

const ADPE_THEME: MetricTheme = {
  id: 'adpe',
  title: 'Métaux Rares (ADPe)',
  subtitle: 'Ressources minérales — ng Sb eq',
  unit: 'ng Sb eq',
  accentColor: ADPE_ACCENT,
  headerClass: 'text-amber-700',
  sectionBorderClass: 'border-amber-100',
  definitionBorderClass: 'border-amber-100 bg-amber-50/50',
  tooltipId: 'tooltip-adpe',
  tooltipAriaLabel: 'Définition de l’indicateur Métaux Rares (ADPe)',
  tooltipText:
    'Impact matériel (métaux rares) de la fabrication des serveurs, rapporté à l\'usage.',
  definition:
    'Épuisement des ressources abiotiques. Représente l\'impact de la fabrication du matériel (métaux rares des serveurs) rapporté à la durée de votre requête.',
}

function formatBarLabel(value: unknown, unit: string): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${formatImpactNumber(n)} ${unit}`
}

/** Impact plus faible = gagnant (sauf incompatible). */
function resolveBarColor(
  slot: 'a' | 'b',
  valueA: number,
  valueB: number,
  accentColor: string
): string {
  if (slot === 'a') return REFERENCE_BAR_COLOR
  const bWins = valueB <= valueA
  return bWins ? accentColor : REFERENCE_BAR_COLOR
}

function ChartModelLegend({ modelA, modelB }: { modelA: EcoImpactModel; modelB: EcoImpactModel }) {
  const items = [
    { model: modelA, tag: 'A' },
    { model: modelB, tag: 'B' },
  ] as const

  return (
    <ul
      className="flex flex-wrap gap-4 sm:gap-6 mb-2 list-none p-0"
      aria-label="Modèles comparés"
    >
      {items.map(({ model, tag }) => (
        <li key={model.id} className="flex items-center gap-2 text-sm text-slate-700">
          <Image
            src={getProviderIcon(model.modelProvider)}
            alt=""
            width={24}
            height={24}
            className="rounded-sm object-contain shrink-0"
            aria-hidden
          />
          <span>
            <span className="font-semibold text-slate-500">Modèle {tag}</span>
            {' — '}
            <span className="font-medium text-slate-900">{model.modelName}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function MetricModelLegend({ theme }: { theme: MetricTheme }) {
  return (
    <ul
      className="flex flex-wrap gap-4 text-xs text-slate-600 list-none p-0 mb-2"
      aria-label={`Légende couleurs — ${theme.title}`}
    >
      <li className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm shrink-0 bg-slate-200"
          aria-hidden
        />
        Modèle A (référence)
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-sm shrink-0"
          style={{ backgroundColor: theme.accentColor }}
          aria-hidden
        />
        Modèle B (si meilleur impact)
      </li>
    </ul>
  )
}

function KpiSectionHeader({ theme }: { theme: MetricTheme }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
      <h3 id={`kpi-heading-${theme.id}`} className={`text-sm font-semibold ${theme.headerClass}`}>
        {theme.title}
      </h3>
      <KpiHelpTooltip
        tooltipId={theme.tooltipId}
        ariaLabel={theme.tooltipAriaLabel}
        description={theme.tooltipText}
      />
      <p className="w-full text-xs text-slate-500 mt-0.5">{theme.subtitle}</p>
    </div>
  )
}

function KpiDefinition({ theme }: { theme: MetricTheme }) {
  return (
    <p
      className={`text-xs text-slate-600 leading-relaxed mt-3 px-3 py-2.5 rounded-md border ${theme.definitionBorderClass}`}
    >
      <span className={`font-semibold ${theme.headerClass}`}>{theme.subtitle}</span>
      {' : '}
      {theme.definition}
    </p>
  )
}

function YAxisTickWithNa({
  x = 0,
  y = 0,
  payload,
  rowsByKey,
}: {
  x?: string | number
  y?: string | number
  payload?: { value: string }
  rowsByKey: Map<string, HorizontalRow>
}) {
  const row = payload?.value ? rowsByKey.get(payload.value) : undefined
  if (!row) return null

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-4} y={0} dy={4} textAnchor="end" fill="#334155" fontSize={11}>
        {row.modelName}
      </text>
      {row.isIncompatible ? (
        <text x={-4} y={14} dy={4} textAnchor="end" fill="#b45309" fontSize={10} fontWeight={600}>
          N/A
        </text>
      ) : null}
    </g>
  )
}

function HorizontalMetricChart({
  theme,
  modelA,
  modelB,
  dataKey,
}: {
  theme: MetricTheme
  modelA: ImpactChartModel
  modelB: ImpactChartModel
  dataKey: 'energyWh' | 'adpe'
}) {
  const scaleForChart = (kgOrWh: number) =>
    dataKey === 'adpe' ? adpeKgToNanograms(kgOrWh) : kgOrWh

  const rawA = modelA.impact.status === 'ok' ? modelA.impact[dataKey] : 0
  const rawB = modelB.impact.status === 'ok' ? modelB.impact[dataKey] : 0

  const slots: Array<{ chart: ImpactChartModel; slot: 'a' | 'b'; axisKey: string }> = [
    { chart: modelA, slot: 'a', axisKey: 'Modèle A' },
    { chart: modelB, slot: 'b', axisKey: 'Modèle B' },
  ]

  const rows: HorizontalRow[] = slots.map(({ chart, slot, axisKey }) => {
    const isIncompatible = chart.impact.status === 'incompatible_multimodal'
    const rawValue = isIncompatible ? 0 : chart.impact[dataKey]
    return {
      name: axisKey,
      modelName: chart.model.modelName,
      value: scaleForChart(rawValue),
      slot,
      isIncompatible,
      fill: isIncompatible
        ? REFERENCE_BAR_COLOR
        : resolveBarColor(slot, rawA, rawB, theme.accentColor),
    }
  })

  const rowsByKey = new Map(rows.map((row) => [row.name, row]))
  const chartHeight = Math.max(120, rows.length * 64)

  return (
    <section
      className={`w-full space-y-2 rounded-lg border p-4 ${theme.sectionBorderClass}`}
      aria-labelledby={`kpi-heading-${theme.id}`}
    >
      <KpiSectionHeader theme={theme} />
      <MetricModelLegend theme={theme} />

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={rows}
          margin={{ top: 4, right: 96, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} unit={` ${theme.unit}`} domain={[0, 'auto']} />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tick={(props) => <YAxisTickWithNa {...props} rowsByKey={rowsByKey} />}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const row = item?.payload as HorizontalRow | undefined
              if (row?.isIncompatible) return INCOMPATIBLE_TEXT_ONLY_LABEL
              return formatBarLabel(value, theme.unit)
            }}
            labelFormatter={(_label, items) => {
              const row = items?.[0]?.payload as HorizontalRow | undefined
              return row?.modelName ?? String(_label)
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            minPointSize={2}
            label={{
              position: 'right',
              fontSize: 11,
              fill: '#334155',
              formatter: (value) => {
                if (Number(value) === 0 && rows.some((row) => row.isIncompatible)) return 'N/A'
                return formatBarLabel(value, theme.unit)
              },
            }}
          >
            {rows.map((row) => (
              <Cell key={`${row.slot}-${row.name}`} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <KpiDefinition theme={theme} />
    </section>
  )
}

export default function ImpactComparisonChart({ modelA, modelB }: ImpactComparisonChartProps) {
  return (
    <div className="mt-4 space-y-6">
      <div>
        <ChartModelLegend modelA={modelA.model} modelB={modelB.model} />
        <p className="text-xs text-slate-500">
          Modèle A = référence (gris). Modèle B = couleur KPI (
          <span className="text-[#0080A3] font-medium">énergie</span>
          {' / '}
          <span className="text-amber-600 font-medium">métaux rares</span>
          ) lorsqu&apos;il affiche un meilleur impact.
        </p>
      </div>

      <HorizontalMetricChart
        theme={ENERGY_THEME}
        modelA={modelA}
        modelB={modelB}
        dataKey="energyWh"
      />

      <HorizontalMetricChart
        theme={ADPE_THEME}
        modelA={modelA}
        modelB={modelB}
        dataKey="adpe"
      />
    </div>
  )
}
