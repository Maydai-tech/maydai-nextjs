/**
 * Textes produit pour l'affichage lecture des cas inacceptables (hors LLM).
 */

export type DeploymentUrgency = 'past' | 'future_or_today' | 'unknown'

/** Libellés CTA dossier — source unique pour ce lot (todo-helpers inchangé pour l'instant). */
export const UNACCEPTABLE_CTA_STOPPING_PROOF =
  'Compléter la preuve d’arrêt du système'

export const UNACCEPTABLE_CTA_SYSTEM_PROMPT =
  'Définir les instructions système & prompts'

export function getDeploymentUrgency(
  deploymentDateIso: string | null | undefined
): DeploymentUrgency {
  if (!deploymentDateIso?.trim()) return 'unknown'
  const d = new Date(deploymentDateIso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today ? 'past' : 'future_or_today'
}

/** Phrase unique du bandeau rouge (statut + conséquence selon la date). */
export function getUnacceptableStatusBannerLines(
  urgency: DeploymentUrgency
): { primary: string; secondary: string | null } {
  const primary = "Ce cas d'usage est interdit."
  if (urgency === 'past') {
    return { primary, secondary: 'Ce système doit être arrêté.' }
  }
  if (urgency === 'future_or_today') {
    return { primary, secondary: 'Ce système ne doit pas être lancé.' }
  }
  return {
    primary,
    secondary:
      'Renseignez la date de déploiement dans le dossier pour prioriser les actions.',
  }
}

/** Indication de priorité sous les CTA (les deux actions restent toujours visibles). */
export function getUnacceptablePriorityHint(urgency: DeploymentUrgency): string {
  if (urgency === 'past') {
    return 'Priorité réglementaire : documenter l’arrêt du système (preuve et traçabilité).'
  }
  if (urgency === 'future_or_today') {
    return 'Priorité réglementaire : sécuriser le futur déploiement (instructions système, prompts et garde-fous).'
  }
  return 'Les deux actions ci-dessous sont requises ; la date de déploiement permet d’en hiérarchiser l’urgence.'
}

/**
 * Texte sous le titre « Motif principal d'interdiction » (UnacceptableInterditsPanel).
 * interdit_1 reste déterministe ; pas de doublon avec le titre de carte.
 */
export const UNACCEPTABLE_INTERDIT1_INTRO =
  "D'après votre questionnaire, ce cas d'usage relève d'une pratique interdite par l'AI Act."

/** Titres de section pour le motif (interdit_1) — uniquement questions E4.N7.* */
export const UNACCEPTABLE_INTERDIT1_SECTION_LABELS: Record<
  'E4.N7.Q2.1' | 'E4.N7.Q3' | 'E4.N7.Q3.1',
  string
> = {
  'E4.N7.Q2.1': "Contexte d'usage concerné",
  'E4.N7.Q3': 'Finalités interdites identifiées',
  'E4.N7.Q3.1': "Situations d'intervention concernées",
}

/** Texte fixe interdit_2 (hors LLM). */
export const UNACCEPTABLE_INTERDIT2_BODY =
  "Vous devez apporter la preuve que le système d'IA concerné a bien été arrêté ou n'a pas été déployé, et conserver une traçabilité permettant de le démontrer en cas de contrôle (documents, captures, attestations, etc.)."

/** Texte fixe interdit_3 (hors LLM). */
export const UNACCEPTABLE_INTERDIT3_BODY =
  "Vous devez documenter les instructions système, les prompts et les garde-fous prévus pour encadrer le comportement du système, afin d'assurer la reproductibilité et l'auditabilité conformément aux exigences de conformité."

/** Si aucune option « réelle » n'est trouvée pour E4.N7.* */
export const UNACCEPTABLE_INTERDIT1_FALLBACK =
  "Le questionnaire indique un niveau de risque interdit ; les détails des réponses aux questions sur les pratiques prohibées n'ont pas pu être affichés. Consultez l'évaluation ou repassez par le questionnaire pour vérifier les réponses enregistrées."

/** Affiché lorsque le cas n'a pas de company_id : pas de lien dossier valide. */
export const UNACCEPTABLE_DOSSIER_CTAS_DISABLED_HINT =
  "Ce cas d'usage n'est pas rattaché à une entreprise : les liens vers le dossier documents ne sont pas disponibles. Rattachez le cas à une entreprise depuis votre espace ou contactez un administrateur."
