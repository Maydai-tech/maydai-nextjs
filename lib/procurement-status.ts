export type ProcurementStatus = 'open' | 'closed'

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementStatus, string> = { open: 'En cours', closed: 'Clôturé' }

// Statut calculé : ouvert jusqu'à la date limite (ou sans date limite pour les anciens appels).
export function procurementStatus(deadlineAt: string | null | undefined, now = Date.now()): ProcurementStatus {
  return deadlineAt && Date.parse(deadlineAt) <= now ? 'closed' : 'open'
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').trim()
  const needle = normalize(query)
  return !needle || fields.some((field) => field && normalize(field).includes(needle))
}

// En cours : échéance la plus proche d'abord. Clôturés : le plus récent d'abord.
export function groupByStatus<T extends { deadline_at?: string | null }>(items: T[], now = Date.now()) {
  const time = (item: T) => (item.deadline_at ? Date.parse(item.deadline_at) : Infinity)
  const open = items.filter((item) => procurementStatus(item.deadline_at, now) === 'open').sort((a, b) => time(a) - time(b))
  const closed = items.filter((item) => procurementStatus(item.deadline_at, now) === 'closed').sort((a, b) => time(b) - time(a))
  return { open, closed }
}
