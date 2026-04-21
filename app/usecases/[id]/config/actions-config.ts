/**
 * Configuration des actions du rapport — dérivée du catalogue canonique (phase 3).
 * Les libellés CTA alignés sur la to-do utilisent `todo_action_label` du catalogue.
 */

import { getPotentialPoints } from '@/app/dashboard/[id]/todo-list/utils/todo-helpers'
import {
  getCanonicalActionByReportSlot,
  REPORT_STANDARD_SLOT_KEYS_ORDERED,
  resolveCanonicalDocType,
} from '@/lib/canonical-actions'

/** Mapping slot rapport → doc_type canonique (source : `report_slot_target` dans le catalogue). */
export const ACTION_TO_DOCTYPE: Record<string, string> = {}
for (const key of REPORT_STANDARD_SLOT_KEYS_ORDERED) {
  const a = getCanonicalActionByReportSlot(key)
  if (a) ACTION_TO_DOCTYPE[key] = a.doc_type_canonique
}

/**
 * Points à récupérer (malus questionnaire) pour une action — aligné sur la todo dashboard.
 * @param actionKey - La clé de l'action (ex: 'quick_win_1', 'priorite_1')
 * @param responses - Réponses questionnaire du cas (défaut : tableau vide → 0 si pas de mapping malus)
 */
export function getActionPoints(actionKey: string, responses: unknown[] = []): number {
  const docType = ACTION_TO_DOCTYPE[actionKey]

  if (!docType) return 0

  return getPotentialPoints(docType, responses as any[])
}

/**
 * Titre CTA / carte — aligné sur la to-do catalogue (`todo_action_label`).
 */
export function getActionTitle(actionKey: string): string {
  return getCanonicalActionByReportSlot(actionKey)?.todo_action_label ?? ''
}

/**
 * Récupère toutes les métadonnées d'une action
 * @param actionKey - La clé de l'action
 * @returns Un objet contenant le titre, les points et le type de document
 */
export function getActionMetadata(actionKey: string, responses?: unknown[]) {
  return {
    title: getActionTitle(actionKey),
    points: getActionPoints(actionKey, responses),
    docType: ACTION_TO_DOCTYPE[actionKey] || '',
  }
}

/**
 * Vérifie si une action est complétée en fonction du statut du document
 * @param docType - Le type de document
 * @param documentStatuses - Les statuts des documents récupérés via useDocumentStatuses
 * @param companyMaydaiAsRegistry - Indique si MaydAI est déclaré comme registre pour la company
 * @returns true si le document est complété ou validé, false sinon
 */
export function isActionCompleted(
  docType: string,
  documentStatuses: Record<string, { status: string }>,
  companyMaydaiAsRegistry?: boolean
): boolean {
  if (!documentStatuses || !docType) return false

  const canonical = resolveCanonicalDocType(docType)

  if (canonical === 'registry_proof') {
    if (companyMaydaiAsRegistry) return true
    const docStatus = documentStatuses['registry_proof']
    if (!docStatus) return false
    return docStatus.status === 'complete' || docStatus.status === 'validated'
  }

  const docStatus = documentStatuses[canonical]
  if (!docStatus) return false

  return docStatus.status === 'complete' || docStatus.status === 'validated'
}
