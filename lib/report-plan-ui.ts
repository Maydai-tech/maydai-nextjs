/**
 * Ligne narrative affichée pour chaque mesure du plan d’action (rapport web / PDF).
 * Si le LLM n’a rien fourni (ou chaîne vide), on n’affiche pas un « trou » : on utilise le statut
 * déterministe du questionnaire (`computeSlotStatuses`) et les libellés du catalogue (`action`).
 * Les CTA to-do / dossier restent toujours construits côté `buildReportCanonicalItemForSlot`.
 */

import type { CanonicalActionDefinition } from '@/lib/canonical-actions'
import type { SlotStatus } from '@/lib/slot-statuses'

export function getReportPlanNarrativeLine(
  llmText: string | null | undefined,
  slotStatus: SlotStatus | null | undefined,
  action: CanonicalActionDefinition
): string {
  const trimmed = (llmText ?? '').trim()
  if (trimmed.length > 0) return trimmed

  if (slotStatus === 'OUI') {
    return `D’après le questionnaire, la mesure « ${action.label} » est déclarée comme en place. Consolidez la preuve dans le dossier de conformité si ce n’est pas déjà fait.`
  }
  if (slotStatus === 'NON') {
    return `D’après le questionnaire, la mesure « ${action.label} » est déclarée comme absente ou insuffisante. Utilisez l’action ci-dessous pour renseigner la to-do et le dossier.`
  }
  if (slotStatus === 'Information insuffisante') {
    return `Les réponses au questionnaire ne permettent pas de conclure sur « ${action.label} ». Complétez l’évaluation ou le dossier pour clarifier la situation.`
  }

  return action.todo_explanation
}
