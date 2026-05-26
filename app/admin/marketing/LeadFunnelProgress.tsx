import { FUNNEL_CONFIG, type FunnelStage } from './types'

const FUNNEL_SEGMENT_COUNT = 6

type Props = {
  stage: FunnelStage
}

export function LeadFunnelProgress({ stage }: Props) {
  const { label } = FUNNEL_CONFIG[stage]

  return (
    <div
      role="progressbar"
      aria-valuenow={stage}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-label={`Progression du lead : ${label}`}
    >
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div className="mt-1 flex gap-1" aria-hidden="true">
        {Array.from({ length: FUNNEL_SEGMENT_COUNT }, (_, index) => (
          <div
            key={index}
            className={`h-2 w-4 rounded-sm transition-colors duration-200 ${
              index <= stage ? 'bg-[#0080A3]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
