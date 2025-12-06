import { getTodoActionMapping } from '@/lib/todo-action-sync'
import { normalizeScoreTo100 } from '@/lib/score-calculator-simple'

interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived' | 'completed'
  risk_level?: string
  score_final?: number | null
  deployment_date?: string | null
}

interface DocumentStatus {
  hasDocument: boolean
  status: 'incomplete' | 'complete' | 'validated'
}

/**
 * Determines if a use case is classified as unacceptable
 * An unacceptable case must have risk_level='unacceptable' AND a deployment_date set
 */
export const isUnacceptableCase = (useCase: UseCase): boolean => {
  return useCase.risk_level?.toLowerCase() === 'unacceptable' && !!useCase.deployment_date
}

/**
 * Determines which document type is required for an unacceptable case
 * - If deployment_date is in the PAST: requires 'stopping_proof' (evidence system was stopped)
 * - If deployment_date is in the FUTURE: requires 'system_prompt' (system instructions)
 * - Returns null if case is not unacceptable or has no deployment_date
 */
export const getRequiredDocumentType = (useCase: UseCase): 'stopping_proof' | 'system_prompt' | null => {
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

/**
 * List of compliance document types for non-unacceptable use cases
 * Ordered by priority (1 to 8)
 */
export const COMPLIANCE_DOCUMENT_TYPES = [
  'system_prompt',          // 1. Définir les instructions système & prompts
  'human_oversight',        // 2. Désigner le(s) responsable(s) de surveillance
  'technical_documentation',// 3. Importer la documentation technique
  'transparency_marking',   // 4. Renseigner le marquage de transparence
  'data_quality',           // 5. Justifier la qualité des données (Procédure)
  'risk_management',        // 6. Joindre le plan de gestion des risques
  'continuous_monitoring',  // 7. Établir le plan de surveillance continue
  'training_census'         // 8. Recenser les formations AI Act
] as const

export type ComplianceDocumentType = typeof COMPLIANCE_DOCUMENT_TYPES[number]
export type DocumentType = 'stopping_proof' | 'system_prompt' | ComplianceDocumentType

/**
 * Returns the French label for a document type
 */
export const getDocumentLabel = (docType: DocumentType): string => {
  switch (docType) {
    case 'stopping_proof':
      return 'Preuve d\'arrêt du système'
    case 'system_prompt':
      return 'Instructions système'
    case 'technical_documentation':
      return 'Documentation technique du système'
    case 'human_oversight':
      return 'Responsable de la surveillance humaine'
    case 'transparency_marking':
      return 'Marquage de transparence IA'
    case 'risk_management':
      return 'Plan de gestion des risques'
    case 'data_quality':
      return 'Procédure de qualité des données'
    case 'continuous_monitoring':
      return 'Plan de surveillance continue'
    case 'training_census':
      return 'Recensement des formations AI Act'
    default:
      return 'Document requis'
  }
}

/**
 * Returns the French action text for a document todo item
 */
export const getDocumentTodoText = (docType: DocumentType): string => {
  switch (docType) {
    case 'stopping_proof':
      return 'Compléter la preuve d\'arrêt du système'
    case 'system_prompt':
      return 'Définir les instructions système & prompts'
    case 'technical_documentation':
      return 'Importer la documentation technique'
    case 'human_oversight':
      return 'Désigner le(s) responsable(s) de surveillance'
    case 'transparency_marking':
      return 'Renseigner le marquage de transparence'
    case 'risk_management':
      return 'Joindre le plan de gestion des risques'
    case 'data_quality':
      return 'Justifier la qualité des données (Procédure)'
    case 'continuous_monitoring':
      return 'Établir le plan de surveillance continue'
    case 'training_census':
      return 'Recenser les formations AI Act'
    default:
      return 'Compléter le document requis'
  }
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
 * Returns the explanatory text for a document type
 */
export const getDocumentExplanation = (docType: DocumentType): string => {
  switch (docType) {
    case 'stopping_proof':
      return "Ce cas d'usage IA a été identifié comme inacceptable selon l'AI Act. Vous devez fournir une preuve que le système a bien été arrêté (email, capture d'écran, attestation, etc.)."
    case 'system_prompt':
      return "Ce cas d'usage IA sera déployé prochainement et a été identifié comme inacceptable. Vous devez documenter les instructions système qui seront utilisées."
    case 'technical_documentation':
      return "Décrivez le(s) modèle(s) d'IA utilisé(s), l'architecture générale, les capacités prévues et surtout les limitations connues (risques d'hallucination, biais potentiels, etc.)."
    case 'human_oversight':
      return "Désignez une personne physique claire, responsable de la supervision \"human-in-the-loop\" ou de l'audit a posteriori. Cela garantit l'accountability (responsabilité) du système."
    case 'transparency_marking':
      return "Décrivez comment le contenu généré par l'IA est marqué comme tel (ex: \"Généré par IA\", watermark, disclaimer). L'utilisateur final doit être informé qu'il interagit avec une IA."
    case 'risk_management':
      return "Documentez que les risques potentiels (biais, sécurité, confidentialité, mauvais usage) ont été identifiés et que des mesures sont en place pour les atténuer."
    case 'data_quality':
      return "Démontrez que les données utilisées (pour l'entraînement, le fine-tuning, ou le RAG) sont de bonne qualité, non biaisées et gérées correctement."
    case 'continuous_monitoring':
      return "Détaillez les métriques (KPIs) de performance suivies, la fréquence des audits, et la procédure en cas de détection d'anomalie ou de risque émergent."
    case 'training_census':
      return "Recensez les formations AI Act suivies par vos équipes. Documentez les participants, dates, contenus et certificats obtenus pour démontrer la compétence de votre organisation en matière de conformité."
    default:
      return "Veuillez fournir le document requis pour ce cas d'usage."
  }
}

/**
 * Gets the potential score points that can be gained by completing a document action.
 * Returns the NORMALIZED points (as they appear in final score) only if the current
 * response is the "negative" answer.
 * Returns 0 if no response exists or if response is already positive.
 *
 * The final score formula is: ((score_base + score_model) / 120) * 100
 * So raw points are converted with: (rawPoints / 120) * 100
 *
 * For example, if technical_documentation has score_impact -10:
 * - Raw points: 10
 * - Normalized points: (10 / 120) * 100 ≈ 8 points
 *
 * Uses the mapping from questions-with-scores.json via getTodoActionMapping
 * to maintain a single source of truth.
 *
 * @param docType - The document type (e.g., 'technical_documentation')
 * @param responses - Array of questionnaire responses for the use case
 * @returns The potential normalized points to gain (0 if no points can be gained)
 */
export const getPotentialPoints = (docType: string, responses: any[]): number => {
  // Get the mapping dynamically from questions-with-scores.json
  const mapping = getTodoActionMapping(docType)
  if (!mapping) return 0

  // Find the current response for this question
  const response = responses.find((r: any) => r.question_code === mapping.questionCode)

  // Only return points if the current answer is the "negative" one
  // (meaning completing the action will change it to positive and gain points)
  if (response?.single_value === mapping.negativeAnswerCode) {
    // Convert raw points to normalized points (as they appear in final score)
    return normalizeScoreTo100(mapping.expectedPointsGained)
  }

  return 0
}

/**
 * Gets fixed action points for display purposes.
 * Returns a fixed number of points associated with an action.
 * Used to show consistent point values in both completed and pending states.
 *
 * @param docType - The document type
 * @returns The fixed points for this action (0 if no points defined)
 */
export const getFixedActionPoints = (docType: string): number => {
  switch (docType) {
    case 'human_oversight':
      return 8
    case 'technical_documentation':
      return 8
    case 'transparency_marking':
      return 8
    case 'risk_management':
      return 4
    case 'continuous_monitoring':
      return 4
    // Actions without fixed points display
    case 'system_prompt':
    case 'data_quality':
    case 'training_census':
    case 'stopping_proof':
    default:
      return 0
  }
}

/**
 * Gets fixed points for registry action (always 8 points)
 * @returns 8 points
 */
export const getRegistryActionPoints = (): number => {
  return 8
}

/**
 * Returns CSS classes for risk level badge styling
 */
export const getRiskLevelConfig = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
    case 'minimal':
      return {
        bg: 'bg-[#f1fdfa]',
        border: 'border-green-300',
        text: 'text-green-800',
        label: 'Minimal'
      }
    case 'limited':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        label: 'Limité'
      }
    case 'high':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        label: 'Élevé'
      }
    case 'unacceptable':
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        label: 'Inacceptable'
      }
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        text: 'text-gray-800',
        label: 'Non évalué'
      }
  }
}
