/** Carte option questionnaire (parcours long / court) — Design System aligné. */
export const selectableCardBase =
  'relative flex w-full min-w-0 items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#0080A3]'

export const selectableCardInteractive =
  'cursor-pointer hover:border-[#0080A3] hover:shadow-sm'

export const selectableCardSelected =
  'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3] shadow-sm'

export const selectableCardDimmed = 'pointer-events-none cursor-default opacity-50'

export function VisualRadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? 'border-[#0080A3] bg-white' : 'border-gray-300 bg-white'
      }`}
      aria-hidden
    >
      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-[#0080A3]" /> : null}
    </span>
  )
}

export function VisualCheckboxMark({ checked, exclusive }: { checked: boolean; exclusive: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
        checked
          ? exclusive
            ? 'border-gray-700 bg-gray-800'
            : 'border-[#0080A3] bg-[#0080A3]'
          : 'border-gray-300 bg-white'
      }`}
      aria-hidden
    >
      {checked && !exclusive ? (
        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      {checked && exclusive ? <span className="h-2 w-2 rounded-sm bg-white" aria-hidden /> : null}
    </span>
  )
}
