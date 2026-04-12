'use client'

import {
  V3_SHORT_PATH_SEGMENTS,
  getV3ShortPathSegmentOrder,
  getV3ShortPathProgressPercent,
} from '../../utils/questionnaire-v3-short-path-ux'
import { Check } from 'lucide-react'

type Props = {
  currentQuestionId: string
  isLastQuestion: boolean
}

/**
 * Progression « parcours court » : 5 segments lisibles + barre dédiée (hors graphe métier).
 */
export function V3ShortPathStepper({ currentQuestionId, isLastQuestion }: Props) {
  const activeOrder = getV3ShortPathSegmentOrder(currentQuestionId)
  const percent = getV3ShortPathProgressPercent(currentQuestionId, isLastQuestion)

  return (
    <div className="mb-8" aria-label="Progression du parcours court">
      <div className="flex justify-between items-baseline gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-900">Votre parcours</span>
        <span className="text-xs font-medium text-teal-800 tabular-nums">
          Étape {activeOrder} / {V3_SHORT_PATH_SEGMENTS.length}
        </span>
      </div>

      <div
        className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin"
        role="list"
      >
        {V3_SHORT_PATH_SEGMENTS.map((seg) => {
          const done = seg.order < activeOrder
          const current = seg.order === activeOrder
          return (
            <div
              key={seg.key}
              role="listitem"
              className={`min-w-[7.5rem] sm:min-w-0 sm:flex-1 snap-start rounded-lg border px-2 py-2 sm:px-3 sm:py-2.5 text-left transition-colors ${
                current
                  ? 'border-[#0080A3] bg-[#0080A3]/8 ring-1 ring-[#0080A3]/20'
                  : done
                    ? 'border-teal-200/80 bg-teal-50/50'
                    : 'border-gray-200/90 bg-gray-50/60'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    current
                      ? 'bg-[#0080A3] text-white'
                      : done
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-300 text-white'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : seg.order}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 ${
                    current ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {seg.title}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed">
        <span className="font-medium text-gray-800">{V3_SHORT_PATH_SEGMENTS[activeOrder - 1].title}</span>
        {' — '}
        {V3_SHORT_PATH_SEGMENTS[activeOrder - 1].tagline}
      </p>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-teal-600 to-[#0080A3] h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-500 mt-1.5">
        Progression adaptée au parcours court (indépendante du décompte technique du parcours long).
      </p>
    </div>
  )
}
