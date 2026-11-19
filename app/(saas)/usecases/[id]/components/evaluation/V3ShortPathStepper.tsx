'use client'

import {
  V3_SHORT_PATH_SEGMENT_COUNT,
  V3_SHORT_PATH_SEGMENTS,
  getV3ShortPathSegmentForQuestion,
  getV3ShortPathSegmentOrder,
  getV3ShortPathProgressPercent,
} from '../../utils/questionnaire-v3-short-path-ux'
import { Check } from 'lucide-react'

type Props = {
  currentQuestionId: string
  isLastQuestion: boolean
  /** Parcours court : pastilles compactes (numéro / check uniquement), sans titres de segment. */
  hideSegmentCardTitles?: boolean
}

/**
 * Progression « parcours court » : 7 segments (indicateurs visuels non interactifs) + barre dédiée.
 */
export function V3ShortPathStepper({
  currentQuestionId,
  isLastQuestion,
  hideSegmentCardTitles = false,
}: Props) {
  const activeOrder = getV3ShortPathSegmentOrder(currentQuestionId)
  const activeSegment = getV3ShortPathSegmentForQuestion(currentQuestionId)
  const percent = getV3ShortPathProgressPercent(currentQuestionId, isLastQuestion)

  return (
    <div className="mb-8 font-sans">
      <div className="flex justify-between items-baseline gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-900">Votre parcours</span>
        {!hideSegmentCardTitles ? (
          <span className="text-xs font-medium text-[#0080A3] tabular-nums">
            Étape {activeOrder} / {V3_SHORT_PATH_SEGMENT_COUNT}
          </span>
        ) : null}
      </div>

      <ol
        className="m-0 flex w-full list-none items-center gap-1 overflow-x-auto px-1 pb-2 -mx-1 ps-0 snap-x snap-mandatory scrollbar-thin sm:gap-1.5"
        aria-label="Étapes du parcours"
      >
        {V3_SHORT_PATH_SEGMENTS.map((seg) => {
          const done = seg.order < activeOrder
          const current = seg.order === activeOrder
          return (
            <li
              key={seg.key}
              aria-current={current ? 'step' : undefined}
              className={`min-w-[7.5rem] cursor-default snap-start rounded-lg border px-2 py-2 text-left transition-colors sm:min-w-0 sm:flex-1 sm:px-3 sm:py-2.5 ${
                current
                  ? 'border-[#0080A3] bg-[#0080A3]/8 ring-1 ring-[#0080A3]/20'
                  : done
                    ? 'border-[#0080A3]/25 bg-[#0080A3]/6'
                    : 'border-gray-200/90 bg-gray-50/60'
              }`}
            >
              {done ? (
                <span className="sr-only">
                  Étape {seg.order} complétée : {seg.title}
                </span>
              ) : null}
              {current && hideSegmentCardTitles ? (
                <span className="sr-only">
                  Étape {seg.order} en cours : {seg.title}
                </span>
              ) : null}
              <div
                className={`flex items-center gap-1 mb-0.5 ${
                  hideSegmentCardTitles ? 'justify-center' : ''
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    current
                      ? 'bg-[#0080A3] text-white'
                      : done
                        ? 'bg-[#0080A3] text-white'
                        : 'bg-gray-300 text-white'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : seg.order}
                </span>
                {!hideSegmentCardTitles ? (
                  <span
                    className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 ${
                      current ? 'text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {seg.title}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      {hideSegmentCardTitles ? (
        <p
          className="mb-3 px-1 text-sm leading-snug text-gray-900 sm:text-[13px]"
          aria-hidden="true"
        >
          <span className="font-medium text-[#0080A3] tabular-nums">
            Étape {activeOrder} / {V3_SHORT_PATH_SEGMENT_COUNT}
          </span>
          <span className="text-gray-500"> : </span>
          <span className="font-semibold text-gray-900">{activeSegment.title}</span>
        </p>
      ) : null}

      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={V3_SHORT_PATH_SEGMENT_COUNT}
        aria-valuenow={activeOrder}
        aria-valuetext={`Étape ${activeOrder} sur ${V3_SHORT_PATH_SEGMENT_COUNT}`}
        aria-label="Progression dans le questionnaire"
        className="w-full overflow-hidden rounded-full bg-gray-200 h-2"
      >
        <div
          className="h-2 rounded-full bg-[#0080A3] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
