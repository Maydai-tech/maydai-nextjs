const GO = 1_000_000_000
const NOISE_FLOOR_BYTES = 50_000_000

export function formatGo(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < NOISE_FLOOR_BYTES) {
    return '0 Go'
  }
  const valueInGo = bytes / GO
  // Math.floor (not round) — conservative display: never over-reports usage on a fill gauge.
  const oneDecimal = (Math.floor(valueInGo * 10) / 10).toFixed(1)
  return `${oneDecimal.replace('.', ',')} Go`
}

export function usageBarClass(usePercent: number): string {
  if (usePercent >= 85) return 'bg-red-600'
  if (usePercent >= 70) return 'bg-orange-500'
  return 'bg-emerald-500'
}

export function parseUsePercent(input: string | number | undefined | null): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.round(input)
  }
  if (typeof input === 'string') {
    const n = parseInt(input.replace('%', '').trim(), 10)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const PURGE_HOUR_UTC = 3
const SUNDAY = 0

export function nextPurgeFr(now: Date = new Date()): string {
  const next = new Date(now.getTime())
  const dayOfWeek = next.getUTCDay()

  let daysToAdd: number
  if (dayOfWeek === SUNDAY) {
    const beforePurge =
      next.getUTCHours() < PURGE_HOUR_UTC ||
      (next.getUTCHours() === PURGE_HOUR_UTC &&
        next.getUTCMinutes() === 0 &&
        next.getUTCSeconds() === 0 &&
        next.getUTCMilliseconds() === 0 &&
        now.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), PURGE_HOUR_UTC))
    daysToAdd = beforePurge ? 0 : 7
  } else {
    daysToAdd = (7 - dayOfWeek) % 7
  }

  next.setUTCDate(next.getUTCDate() + daysToAdd)
  next.setUTCHours(PURGE_HOUR_UTC, 0, 0, 0)

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(next)
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekday = pick('weekday').replace('.', '').toLowerCase()
  const day = pick('day')
  const month = pick('month') // fr-FR: "mai", "janv.", "avr." — keep dot as-is from Intl
  const hour = pick('hour')
  const minute = pick('minute')
  return `${weekday} ${day} ${month} à ${hour}h${minute}`
}
