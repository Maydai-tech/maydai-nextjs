import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export function parisDeadlineToUtc(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const local = `${date}T${time}:00`
  const instant = fromZonedTime(local, 'Europe/Paris')
  if (!Number.isFinite(instant.getTime())) return null
  // Reject impossible dates and times skipped by the daylight-saving transition.
  if (formatInTimeZone(instant, 'Europe/Paris', "yyyy-MM-dd'T'HH:mm:ss") !== local) return null
  return instant.toISOString()
}
