'use client'

import { AlertTriangle } from 'lucide-react'
import {
  getDeploymentUrgency,
  getUnacceptableStatusBannerLines,
  type DeploymentUrgency,
} from '@/lib/unacceptable-case-copy'

type Props = {
  deploymentDateIso: string | null | undefined
  /** Si déjà calculé côté parent, évite de recalculer. */
  urgency?: DeploymentUrgency
}

export default function UnacceptableStatusBanner({
  deploymentDateIso,
  urgency: urgencyProp,
}: Props) {
  const urgency = urgencyProp ?? getDeploymentUrgency(deploymentDateIso)
  const { primary, secondary } = getUnacceptableStatusBannerLines(urgency)

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
          aria-hidden
        />
        <div className="min-w-0 space-y-1 text-sm text-red-900">
          <p className="font-semibold leading-snug">{primary}</p>
          {secondary ? (
            <p className="leading-relaxed text-red-800">{secondary}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
