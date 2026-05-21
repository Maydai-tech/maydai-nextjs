/**
 * Ligne narrative affichée pour chaque mesure du plan d’action (rapport web / PDF).
 * Si le LLM n’a rien fourni (ou chaîne vide), on n’affiche pas un « trou » : on utilise le statut
 * déterministe du questionnaire (`computeSlotStatuses`) et les libellés du catalogue (`action`).
 * Les CTA to-do / dossier restent toujours construits côté `buildReportCanonicalItemForSlot`.
 */

import type { CanonicalActionDefinition } from '@/lib/canonical-actions'
import { enforceStatusPrefix, type SlotStatus } from '@/lib/slot-statuses'

function isKnownSlotStatus(s: SlotStatus | null | undefined): s is SlotStatus {
  return s === 'OUI' || s === 'NON' || s === 'Information insuffisante'
}

/** Texte nextsteps déjà préfixé par le LLM (ou une génération antérieure) — ne pas réaligner. */
function hasKnownStatusPrefix(text: string): boolean {
  return (
    text.startsWith('OUI : ') ||
    text.startsWith('NON : ') ||
    text.startsWith('Information insuffisante : ')
  )
}

export function getReportPlanNarrativeLine(
  llmText: string | null | undefined,
  slotStatus: SlotStatus | null | undefined,
  action: CanonicalActionDefinition
): string {
  const trimmed = (llmText ?? '').trim()
  if (trimmed.length > 0) {
    if (hasKnownStatusPrefix(trimmed)) {
      return trimmed
    }
    if (isKnownSlotStatus(slotStatus)) {
      return enforceStatusPrefix(trimmed, slotStatus)
    }
    return trimmed
  }

  if (slotStatus === 'OUI') {
    return `D’après le questionnaire, la mesure « ${action.label} » est déclarée comme en place. Documentez la preuve dans le dossier du cas si ce n’est pas déjà fait.`
  }
  if (slotStatus === 'NON') {
    return `D’après le questionnaire, la mesure « ${action.label} » est déclarée comme absente (ou non documentée à ce stade). Utilisez l’action ci-dessous pour renseigner la todo conformité et le dossier du cas.`
  }
  if (slotStatus === 'Information insuffisante') {
    return `Les réponses au questionnaire ne permettent pas encore de conclure sur « ${action.label} ». Complétez l’évaluation ou le dossier du cas pour documenter la situation.`
  }

  return action.todo_explanation
}
