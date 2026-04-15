// --- Draft du chat guidé ---
export interface GuidedChatDraft {
  name: string
  /** Phase déclarée (distincte du statut workflow du cas). */
  deployment_phase: string
  deployment_date: string
  responsible_service: string
  technology_partner: string
  technology_partner_id?: number
  llm_model_version: string
  primary_model_id?: string | null
  ai_category: string
  system_type: string
  deployment_countries: string[]
  description: string
}

// --- Payload final envoyé à POST /api/usecases ---
export interface CreateUseCasePayload {
  name: string
  deployment_phase?: string | null
  deployment_date: string
  responsible_service: string
  technology_partner: string
  technology_partner_id?: number
  llm_model_version: string
  primary_model_id: string | null
  ai_category: string
  system_type: string
  deployment_countries: string[]
  description: string
  status: 'draft'
  company_id: string
}

// --- Options fermées (référentiels) ---
export interface ClosedFieldOption {
  label: string
  examples?: string[]
  tooltip?: {
    title: string
    shortContent: string
    fullContent?: string
    icon?: string
  }
}

export interface ModelProviderOption {
  id: number
  name: string
  tooltip_title?: string
  tooltip_short_content?: string
  tooltip_full_content?: string
  tooltip_icon?: string
  tooltip_rank?: number
  tooltip_rank_text?: string
}

export interface ModelOption {
  id: string
  model_name: string
  model_type?: string
  version?: string
  notes_short?: string
  notes_long?: string
  variants?: string[]
  launch_date?: string
}

// --- State UI du mode chat ---
export type ChatStepId =
  | 'name'
  | 'deployment_date'
  | 'responsible_service'
  | 'technology_partner'
  | 'llm_model_version'
  | 'ai_category'
  | 'system_type'
  | 'deployment_countries'
  | 'description'
  | 'review'

export const CHAT_STEP_ORDER: ChatStepId[] = [
  'name',
  'deployment_date',
  'responsible_service',
  'technology_partner',
  'llm_model_version',
  'ai_category',
  'system_type',
  'deployment_countries',
  'description',
  'review',
]

export const CHAT_STEP_LABELS: Record<ChatStepId, string> = {
  name: 'Nom du cas d\'usage',
  deployment_date: 'Date de déploiement',
  responsible_service: 'Service responsable',
  technology_partner: 'Partenaire technologique',
  llm_model_version: 'Modèle LLM',
  ai_category: 'Catégorie IA',
  system_type: 'Type de système',
  deployment_countries: 'Pays de déploiement',
  description: 'Description',
  review: 'Récapitulatif',
}

export const CHAT_STEP_BOT_MESSAGES: Record<ChatStepId, string> = {
  name: 'Comment souhaitez-vous nommer ce cas d\'usage IA ?',
  deployment_date: 'Où en est le déploiement et quelle est la date associée ?',
  responsible_service: 'Quel service est en charge de ce cas d\'usage ?',
  technology_partner: 'Quel est le partenaire technologique ?',
  llm_model_version: 'Quel modèle utilisez-vous ?',
  ai_category: 'Dans quelle catégorie d\'IA s\'inscrit ce cas d\'usage ?',
  system_type: 'S\'agit-il d\'un système autonome ou d\'un produit ?',
  deployment_countries: 'Dans quels pays ce cas d\'usage est-il déployé ?',
  description: 'Décrivez brièvement ce système IA.',
  review: 'Voici le récapitulatif de votre cas d\'usage. Vérifiez les informations avant de créer.',
}

export interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  content: string
  stepId?: ChatStepId
  timestamp: number
}

export interface GuidedChatState {
  currentStepId: ChatStepId
  draft: GuidedChatDraft
  messages: ChatMessage[]
  isSubmitting: boolean
  isGeneratingDescription: boolean
  editingFromReview: boolean
}

// --- Erreurs de validation ---
export interface FieldValidationError {
  field: keyof GuidedChatDraft
  message: string
}

export interface PayloadValidationResult {
  isValid: boolean
  errors: FieldValidationError[]
}

// --- Mode de saisie ---
export type CreationMode = 'form' | 'chat'

export function createEmptyDraft(): GuidedChatDraft {
  return {
    name: '',
    deployment_phase: '',
    deployment_date: '',
    responsible_service: '',
    technology_partner: '',
    technology_partner_id: undefined,
    llm_model_version: '',
    primary_model_id: null,
    ai_category: '',
    system_type: '',
    deployment_countries: [],
    description: '',
  }
}
