import { EU_LICENSE_ALERT_TEXT } from '@/lib/eu-license-alert'

export function EuLicenseAlert() {
  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950"
    >
      {EU_LICENSE_ALERT_TEXT}
    </div>
  )
}
