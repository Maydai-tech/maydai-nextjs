interface UseCase {
  id: string
  name: string
  description: string
  company_id: string
  created_at: string
  updated_at: string
  status: 'draft' | 'active' | 'archived'
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
 * Returns the French label for a document type
 */
export const getDocumentLabel = (docType: 'stopping_proof' | 'system_prompt'): string => {
  switch (docType) {
    case 'stopping_proof':
      return 'Preuve d\'arrêt du système'
    case 'system_prompt':
      return 'Instructions système'
    default:
      return 'Document requis'
  }
}

/**
 * Returns the French action text for a document todo item
 */
export const getDocumentTodoText = (docType: 'stopping_proof' | 'system_prompt'): string => {
  switch (docType) {
    case 'stopping_proof':
      return 'Compléter la preuve d\'arrêt du système'
    case 'system_prompt':
      return 'Compléter les instructions système'
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
export const getDocumentExplanation = (docType: 'stopping_proof' | 'system_prompt'): string => {
  switch (docType) {
    case 'stopping_proof':
      return "Ce cas d'usage IA a été identifié comme inacceptable selon l'AI Act. Vous devez fournir une preuve que le système a bien été arrêté (email, capture d'écran, attestation, etc.)."
    case 'system_prompt':
      return "Ce cas d'usage IA sera déployé prochainement et a été identifié comme inacceptable. Vous devez documenter les instructions système qui seront utilisées."
    default:
      return "Veuillez fournir le document requis pour ce cas d'usage."
  }
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
