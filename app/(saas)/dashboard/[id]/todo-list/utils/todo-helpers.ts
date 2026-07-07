import { getListRiskBadgeStyle } from '@/lib/classification-risk-display'
import { getTodoActionMappings, type TodoActionMapping } from '@/lib/todo-action-sync'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'
import { normalizeScoreTo100 } from '@/lib/score-calculator-simple'
import {
  resolveCanonicalDocType,
  getCanonicalActionByDocType,
  getStandardComplianceDocTypesExcludingRegistry,
} from '@/lib/canonical-actions'
interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived' | 'completed'
  risk_level?: string | null
  classification_status?: string | null
  score_final?: number | null
  deployment_date?: string | null
}

/** Champs suffisants pour la logique date / risque inacceptable (écrans dossier, todo, liste). */
export type UseCaseUnacceptableFields = Pick<UseCase, 'risk_level' | 'deployment_date'>

interface DocumentStatus {
  hasDocument: boolean
  status: 'incomplete' | 'complete' | 'validated'
}

/**
 * Determines if a use case is classified as unacceptable
 * An unacceptable case must have risk_level='unacceptable' AND a deployment_date set
 */
export const isUnacceptableCase = (useCase: UseCaseUnacceptableFields): boolean => {
  return useCase.risk_level?.toLowerCase() === 'unacceptable' && !!useCase.deployment_date
}

/**
 * Action **prioritaire** pour un cas inacceptable (urgence, ordre d’affichage, badges).
 * Les deux documents (preuve d’arrêt + instructions système) restent toujours requis ;
 * ne pas utiliser ce résultat pour masquer l’une des deux actions.
 */
export const getRequiredDocumentType = (
  useCase: UseCaseUnacceptableFields
): 'stopping_proof' | 'system_prompt' | null => {
  if (!useCase.risk_level || useCase.risk_level.toLowerCase() !== 'unacceptable') {
    return null
  }

  if (!useCase.deployment_date) {
    return null
  }

  const deploymentDate = new Date(useCase.deployment_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to midnight

  return deploymentDate < today ? 'stopping_proof' : 'system_prompt'
}

/** Types d’action dossier pour un cas inacceptable (les deux coexistent toujours). */
export const UNACCEPTABLE_ACTION_DOC_TYPES = ['stopping_proof', 'system_prompt'] as const
export type UnacceptableActionDocType = (typeof UNACCEPTABLE_ACTION_DOC_TYPES)[number]

/** Alias explicite pour la priorité / l’urgence (même logique que getRequiredDocumentType). */
export const getUnacceptablePrimaryDocumentType = getRequiredDocumentType

/**
 * Les deux actions, avec l’action prioritaire en premier (date passée → preuve d’arrêt d’abord).
 */
export function getUnacceptableActionDocTypesOrdered(
  useCase: UseCaseUnacceptableFields
): UnacceptableActionDocType[] {
  const primary = getUnacceptablePrimaryDocumentType(useCase)
  if (!primary) {
    return [...UNACCEPTABLE_ACTION_DOC_TYPES]
  }
  const secondary: UnacceptableActionDocType =
    primary === 'stopping_proof' ? 'system_prompt' : 'stopping_proof'
  return [primary, secondary]
}

/**
 * Types doc conformité standard hors registre, ordre = catalogue canonique (positions 2–9).
 */
export const COMPLIANCE_DOCUMENT_TYPES = getStandardComplianceDocTypesExcludingRegistry()

export type ComplianceDocumentType = (typeof COMPLIANCE_DOCUMENT_TYPES)[number]
export type DocumentType =
  | 'stopping_proof'
  | 'system_prompt'
  | 'registry_proof'
  | ComplianceDocumentType

/**
 * Libellé d’affichage — source : catalogue canonique.
 */
export const getDocumentLabel = (docType: DocumentType | string): string => {
  const a = getCanonicalActionByDocType(String(docType))
  if (a) return a.label
  return 'Document requis'
}

/**
 * Texte d’action todo — aligné sur le catalogue (standard et inacceptable).
 */
export const getDocumentTodoText = (docType: DocumentType | string): string => {
  const a = getCanonicalActionByDocType(String(docType))
  if (a) return a.todo_action_label
  return 'Compléter le document requis'
}

/**
 * Checks if a todo item is completed based on document status
 * A document is considered complete if status is 'complete' or 'validated'
 */
export const isTodoCompleted = (documentStatus: DocumentStatus | null | undefined): boolean => {
  if (!documentStatus) return false
  return documentStatus.status === 'complete' || documentStatus.status === 'validated'
}

/**
 * Texte d’aide sous la todo — catalogue canonique.
 */
export const getDocumentExplanation = (docType: DocumentType | string): string => {
  const a = getCanonicalActionByDocType(String(docType))
  if (a) return a.todo_explanation
  return "Veuillez fournir le document requis pour ce cas d'usage."
}

function responseIncludesCode(response: { single_value?: unknown; conditional_main?: unknown; multiple_codes?: unknown }, code: string | null): boolean {
  if (!code || !response) return false
  if (response.single_value === code) return true
  if (response.conditional_main === code) return true
  if (Array.isArray(response.multiple_codes) && response.multiple_codes.includes(code)) return true
  return false
}

/**
 * Fusionne les lignes `usecase_responses` avec `checklist_gov_*` (aligné GET /api/usecases/.../responses).
 */
export function mergeResponsesWithChecklists(
  responses: Array<{ question_code?: string; single_value?: unknown; multiple_codes?: unknown; conditional_main?: unknown }>,
  checklist_gov_enterprise?: string[] | null,
  checklist_gov_usecase?: string[] | null
): Array<{ question_code?: string; single_value?: unknown; multiple_codes?: unknown; conditional_main?: unknown }> {
  return mergeChecklistIntoDbResponseRows(
    responses.map((r) => ({
      question_code: r.question_code ?? '',
      single_value: typeof r.single_value === 'string' ? r.single_value : null,
      multiple_codes: Array.isArray(r.multiple_codes) ? r.multiple_codes : null,
      conditional_main: typeof r.conditional_main === 'string' ? r.conditional_main : null,
    })),
    checklist_gov_enterprise,
    checklist_gov_usecase
  )
}

function isPositiveForMapping(response: { single_value?: unknown; conditional_main?: unknown; multiple_codes?: unknown } | undefined, mapping: TodoActionMapping): boolean {
  if (!response) return false
  return responseIncludesCode(response, mapping.positiveAnswerCode)
}

function isNegativeForMapping(response: { single_value?: unknown; conditional_main?: unknown; multiple_codes?: unknown } | undefined, mapping: TodoActionMapping): boolean {
  if (!response || !mapping.negativeAnswerCode) return false
  return responseIncludesCode(response, mapping.negativeAnswerCode)
}

/**
 * Points normalisés encore récupérables sur une action dossier, d’après le questionnaire
 * (questions `todo_action` / malus récupérable). Aucun forfait catalogue : sans mapping
 * questionnaire → 0.
 *
 * @param docType - The document type (e.g., 'technical_documentation')
 * @param responses - Array of questionnaire responses for the use case
 * @param path_mode - Parcours actif (`short` → dénominateur 140, sinon 150)
 * @returns The potential normalized points to recover (0 if none)
 */
export const getPotentialPoints = (
  docType: string,
  responses: any[],
  path_mode?: string | null
): number => {
  const canonical = resolveCanonicalDocType(docType)

  const mappings = getTodoActionMappings(canonical)
  if (mappings.length === 0) return 0

  let rawPotentialSum = 0
  for (const mapping of mappings) {
    const response = responses.find((r: { question_code?: string }) => r.question_code === mapping.questionCode)

    if (isPositiveForMapping(response, mapping)) {
      continue
    }

    if (!response) {
      rawPotentialSum += mapping.expectedPointsGained
      continue
    }

    if (isNegativeForMapping(response, mapping)) {
      rawPotentialSum += mapping.expectedPointsGained
      continue
    }

    rawPotentialSum += mapping.expectedPointsGained
  }

  return normalizeScoreTo100(rawPotentialSum, path_mode ?? undefined)
}

/**
 * Points normalisés effectivement récupérés (preuve dossier complétée + réponses
 * questionnaire alignées sur les codes « positifs » du mapping malus).
 *
 * @param docType - The document type (e.g., 'technical_documentation')
 * @param responses - Array of questionnaire responses for the use case
 * @param isCompleted - Whether the document is completed
 * @param path_mode - Parcours actif (`short` → dénominateur 140, sinon 150)
 * @returns The normalized points recovered (0 if none)
 */
export const getEarnedPoints = (
  docType: string,
  responses: any[],
  isCompleted: boolean,
  path_mode?: string | null
): number => {
  if (!isCompleted) return 0

  const canonical = resolveCanonicalDocType(docType)

  const mappings = getTodoActionMappings(canonical)
  if (mappings.length === 0) return 0

  let rawEarnedSum = 0
  for (const mapping of mappings) {
    if (!mapping.negativeAnswerCode) continue

    const response = responses.find((r: { question_code?: string }) => r.question_code === mapping.questionCode)
    if (isPositiveForMapping(response, mapping)) {
      rawEarnedSum += mapping.expectedPointsGained
    }
  }

  return normalizeScoreTo100(rawEarnedSum, path_mode ?? undefined)
}

/**
 * Badge liste (todo, dossiers) : tient compte de `classification_status` V3 si présent.
 */
export const getRiskLevelDisplayConfig = (
  useCase: Pick<UseCase, 'risk_level'> & { classification_status?: string | null }
) => getListRiskBadgeStyle(useCase.classification_status, useCase.risk_level ?? null)

/** @deprecated Préférer getRiskLevelDisplayConfig quand `classification_status` est disponible */
export const getRiskLevelConfig = (riskLevel: string) => {
  return getListRiskBadgeStyle(undefined, riskLevel || null)
}
