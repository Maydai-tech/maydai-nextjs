'use client'

import { HelpCircle } from 'lucide-react'

interface KpiHelpTooltipProps {
  /** Identifiant stable pour aria-describedby (ex. tooltip-energie). */
  tooltipId: string
  /** Libellé court lu par les lecteurs d'écran. */
  ariaLabel: string
  description: string
}

export default function KpiHelpTooltip({
  tooltipId,
  ariaLabel,
  description,
}: KpiHelpTooltipProps) {
  return (
    <span className="relative group inline-block ml-2 align-middle">
      <button
        type="button"
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-1"
        aria-describedby={tooltipId}
        aria-label={ariaLabel}
      >
        <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" aria-hidden />
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-white text-xs rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 font-normal text-center"
      >
        {description}
      </div>
    </span>
  )
}
