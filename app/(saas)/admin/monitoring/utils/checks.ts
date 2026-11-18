import { formatGo } from './format'

export const DISK_ALERT_THRESHOLD = 85

export type CheckTone = 'ok' | 'warn' | 'info' | 'muted'

export type MonitoringCheck = {
  key: 'disk-alert' | 'email' | 'logs' | 'docker'
  title: string
  value: string
  details: string
  tone: CheckTone
}

type PurgeLike = {
  ranAt: string
  totalReclaimedBytes: number
  exitCode: number
  errorMessage: string | null
}

export type MonitoringChecksInput = {
  /** null quand l'occupation disque est inconnue */
  usePercent: number | null
  diskError: string | null
  email: { recipient: string; lastSentAt: string } | null
  emailError: string | null
  purges: PurgeLike[]
  purgesError: string | null
  formatDate: (iso: string) => string
}

/** Cartes d'état de la page monitoring, dérivées des données réelles de l'hôte. */
export function buildMonitoringChecks(input: MonitoringChecksInput): MonitoringCheck[] {
  const { usePercent, diskError, email, emailError, purges, purgesError, formatDate } = input

  const diskAlert: MonitoringCheck =
    usePercent === null
      ? { key: 'disk-alert', title: 'Alerte disque', value: 'Indisponible', details: diskError ?? 'Occupation disque inconnue.', tone: 'muted' }
      : usePercent >= DISK_ALERT_THRESHOLD
        ? { key: 'disk-alert', title: 'Alerte disque', value: 'Seuil dépassé', details: `Occupation à ${usePercent} %, au-delà du seuil d’alerte de ${DISK_ALERT_THRESHOLD} %.`, tone: 'warn' }
        : { key: 'disk-alert', title: 'Alerte disque', value: 'Sous le seuil', details: `Occupation à ${usePercent} %, alerte email au-delà de ${DISK_ALERT_THRESHOLD} %.`, tone: 'ok' }

  const emailCheck: MonitoringCheck = emailError
    ? { key: 'email', title: 'Canal email', value: 'Indisponible', details: emailError, tone: 'muted' }
    : email?.lastSentAt
      ? { key: 'email', title: 'Canal email', value: 'Alerte envoyée', details: `Dernière alerte le ${formatDate(email.lastSentAt)} vers ${email.recipient || 'un destinataire inconnu'}.`, tone: 'info' }
      : { key: 'email', title: 'Canal email', value: 'Aucune alerte', details: 'Aucune alerte disque envoyée pour l’instant.', tone: 'ok' }

  // ponytail: l'hôte ne publie pas encore l'état de la rotation des logs ; brancher ici quand un JSON l'exposera.
  const logs: MonitoringCheck = {
    key: 'logs',
    title: 'Rotation des logs',
    value: 'Non suivie',
    details: 'Le serveur ne remonte pas encore l’état de la rotation des logs.',
    tone: 'muted',
  }

  const last = [...purges].sort((a, b) => b.ranAt.localeCompare(a.ranAt))[0]
  const docker: MonitoringCheck = purgesError
    ? { key: 'docker', title: 'Nettoyage Docker', value: 'Indisponible', details: purgesError, tone: 'muted' }
    : !last
      ? { key: 'docker', title: 'Nettoyage Docker', value: 'Aucune purge', details: 'Aucune purge enregistrée pour l’instant.', tone: 'muted' }
      : last.exitCode !== 0
        ? { key: 'docker', title: 'Nettoyage Docker', value: 'Dernière purge en échec', details: `Le ${formatDate(last.ranAt)}${last.errorMessage ? ` : ${last.errorMessage}` : ''}.`, tone: 'warn' }
        : { key: 'docker', title: 'Nettoyage Docker', value: 'OK', details: `Dernière purge le ${formatDate(last.ranAt)} · ${formatGo(last.totalReclaimedBytes)} libérés.`, tone: 'ok' }

  return [diskAlert, emailCheck, logs, docker]
}
