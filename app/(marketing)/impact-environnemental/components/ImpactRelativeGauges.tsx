'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getProviderIcon } from '@/lib/provider-icons'
import {
  adpeKgToNanograms,
  formatImpactNumber,
  type ComputedImpactResult,
  type EcoImpactModel,
} from '@/lib/impact-environnemental'
import KpiHelpTooltip from './KpiHelpTooltip'

export interface ImpactGaugeModel {
  model: EcoImpactModel
  impact: ComputedImpactResult
}

interface ImpactRelativeGaugesProps {
  modelA: ImpactGaugeModel
  modelB: ImpactGaugeModel
}

type MetricTheme = {
  id: 'energy' | 'adpe'
  title: string
  subtitle: string
  unit: string
  activeBarClass: string
  headerClass: string
  tooltipId: string
  tooltipAriaLabel: string
  tooltipText: string
}

const ENERGY_THEME: MetricTheme = {
  id: 'energy',
  title: 'Énergie',
  subtitle: 'Consommation électrique — Wh',
  unit: 'Wh',
  activeBarClass: 'bg-[#0080A3]',
  headerClass: 'text-[#0080A3]',
  tooltipId: 'tooltip-energie',
  tooltipAriaLabel: "Définition de l'indicateur Énergie",
  tooltipText: 'Consommation électrique directe (GPU/CPU) pendant le traitement.',
}

const ADPE_THEME: MetricTheme = {
  id: 'adpe',
  title: 'Métaux Rares (ADPe)',
  subtitle: 'Ressources minérales — ng Sb eq',
  unit: 'ng Sb eq',
  activeBarClass: 'bg-amber-600',
  headerClass: 'text-amber-700',
  tooltipId: 'tooltip-adpe',
  tooltipAriaLabel: "Définition de l'indicateur Métaux Rares (ADPe)",
  tooltipText:
    "Impact matériel (métaux rares) de la fabrication des serveurs, rapporté à l'usage.",
}

function formatReductionBadge(reference: number, comparison: number): string | null {
  if (reference <= 0 || comparison >= reference) return null
  const pct = Math.round(((reference - comparison) / reference) * 100)
  return `-${pct}%`
}

function KpiBlockHeader({ theme }: { theme: MetricTheme }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mb-5">
      <h3 id={`kpi-heading-${theme.id}`} className={`text-base font-semibold ${theme.headerClass}`}>
        {theme.title}
      </h3>
      <KpiHelpTooltip
        tooltipId={theme.tooltipId}
        ariaLabel={theme.tooltipAriaLabel}
        description={theme.tooltipText}
      />
      <p className="w-full text-xs text-slate-500">{theme.subtitle}</p>
    </div>
  )
}

interface ModelGaugeRowProps {
  slot: 'a' | 'b'
  model: EcoImpactModel
  value: number
  unit: string
  /** Largeur de la barre colorée / baseline en %. */
  barWidthPercent: number
  isBaselineRow: boolean
  activeBarClass: string
  showGainBadge: boolean
  gainLabel: string | null
  maxValue: number
  isIncompatible?: boolean
}

function ModelGaugeRow({
  slot,
  model,
  value,
  unit,
  barWidthPercent,
  isBaselineRow,
  activeBarClass,
  showGainBadge,
  gainLabel,
  maxValue,
  isIncompatible = false,
}: ModelGaugeRowProps) {
  const barLabel = isIncompatible
    ? `Modèle ${slot.toUpperCase()} — ${model.modelName}, N/A`
    : `Modèle ${slot.toUpperCase()} — ${model.modelName}, ${formatImpactNumber(value)} ${unit}`
  const safeWidth = isIncompatible ? 2 : Math.min(100, Math.max(barWidthPercent, 2))

  return (
    <div className="space-y-1.5">
      <div
        className="relative w-full h-12 bg-slate-50 rounded-lg overflow-hidden flex items-center"
      >
        <div
          className={`absolute top-0 left-0 h-full rounded-r-lg transition-all duration-300 ${
            isBaselineRow ? 'bg-slate-200' : activeBarClass
          }`}
          style={{ width: `${safeWidth}%` }}
          role="progressbar"
          aria-label={barLabel}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={maxValue}
        />

        <div className="absolute inset-0 flex items-center justify-between px-4 z-10 pointer-events-none">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Image
              src={getProviderIcon(model.modelProvider)}
              alt=""
              width={20}
              height={20}
              className="rounded-sm object-contain shrink-0"
              aria-hidden
            />
            <span className="text-sm font-medium text-slate-900 truncate">{model.modelName}</span>
            {showGainBadge && gainLabel ? (
              <Badge
                variant="success"
                className="ml-4 pointer-events-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm whitespace-nowrap"
                aria-label={`Gain écologique ${gainLabel}`}
              >
                {gainLabel}
              </Badge>
            ) : null}
          </div>

          <span
            className={`text-sm font-bold tabular-nums shrink-0 ml-3 ${
              isIncompatible ? 'text-amber-800' : 'text-slate-700'
            }`}
          >
            {isIncompatible ? 'N/A' : `${formatImpactNumber(value)} ${unit}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function MetricGaugeBlock({
  theme,
  modelA,
  modelB,
  dataKey,
}: {
  theme: MetricTheme
  modelA: ImpactGaugeModel
  modelB: ImpactGaugeModel
  dataKey: 'energyWh' | 'adpe'
}) {
  const naA = modelA.impact.status === 'incompatible_multimodal'
  const naB = modelB.impact.status === 'incompatible_multimodal'

  const rawA = naA ? 0 : modelA.impact[dataKey]
  const rawB = naB ? 0 : modelB.impact[dataKey]
  const isAdpe = dataKey === 'adpe'
  const maxRaw = Math.max(rawA, rawB) || Number.MIN_VALUE

  const widthA = naA ? 0 : (rawA / maxRaw) * 100
  const widthB = naB ? 0 : (rawB / maxRaw) * 100

  const displayA = isAdpe ? adpeKgToNanograms(rawA) : rawA
  const displayB = isAdpe ? adpeKgToNanograms(rawB) : rawB
  const maxDisplay = isAdpe ? adpeKgToNanograms(maxRaw) : maxRaw

  const winner: 'a' | 'b' = rawA <= rawB ? 'a' : 'b'
  const gainOnA = !naA && winner === 'a' && rawA < rawB
  const gainOnB = !naB && winner === 'b' && rawB < rawA

  const gainLabelA =
    gainOnA && rawB > 0 ? formatReductionBadge(rawB, rawA) : null
  const gainLabelB =
    gainOnB && rawA > 0 ? formatReductionBadge(rawA, rawB) : null

  return (
    <section
      className="flex flex-col gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
      aria-labelledby={`kpi-heading-${theme.id}`}
    >
      <KpiBlockHeader theme={theme} />

      {(naA || naB) && (
        <p className="text-xs text-slate-500 -mt-2">
          Un modèle texte-only affiche N/A pour ce cas Vision ; l&apos;autre modèle reste
          comparable.
        </p>
      )}

      <div className="space-y-4">
        <ModelGaugeRow
          slot="a"
          model={modelA.model}
          value={displayA}
          unit={theme.unit}
          barWidthPercent={widthA}
          isBaselineRow
          activeBarClass={theme.activeBarClass}
          showGainBadge={Boolean(gainLabelA)}
          gainLabel={gainLabelA}
          maxValue={maxDisplay}
          isIncompatible={naA}
        />
        <ModelGaugeRow
          slot="b"
          model={modelB.model}
          value={displayB}
          unit={theme.unit}
          barWidthPercent={widthB}
          isBaselineRow={false}
          activeBarClass={theme.activeBarClass}
          showGainBadge={Boolean(gainLabelB)}
          gainLabel={gainLabelB}
          maxValue={maxDisplay}
          isIncompatible={naB}
        />
      </div>
    </section>
  )
}

export default function ImpactRelativeGauges({ modelA, modelB }: ImpactRelativeGaugesProps) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <MetricGaugeBlock
        theme={ENERGY_THEME}
        modelA={modelA}
        modelB={modelB}
        dataKey="energyWh"
      />
      <MetricGaugeBlock
        theme={ADPE_THEME}
        modelA={modelA}
        modelB={modelB}
        dataKey="adpe"
      />
    </div>
  )
}
