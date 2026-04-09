export interface UseCase {
  id: string
  name: string
  description: string
  deployment_date?: string
  status: string
  risk_level: string
  ai_category: string
  technology_partner: string
  llm_model_version?: string
  primary_model_id?: string
  responsible_service: string
  system_type?: string
  deployment_countries?: string[]
  company_id: string
  /** 1 = parcours historique, 2 = parcours long V2 */
  questionnaire_version?: number
  bpgv_variant?: string | null
  active_question_codes?: string[] | null
  ors_exit?: string | null
  company_status?: 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown'  // NOUVEAU: Statut d'entreprise
  created_at: string
  updated_at: string
  updated_by?: string
  updated_by_profile?: {
    first_name: string | null
    last_name: string | null
  }
  score_base?: number
  score_model?: number | null
  score_final?: number | null
  is_eliminated?: boolean
  elimination_reason?: string
  last_calculation_date?: string
  companies?: {
    name: string
    industry: string
    city: string
    country: string
  }
  compl_ai_models?: {
    id: string
    model_name: string
    model_provider: string
    model_type?: string
    version?: string
  }
}

export interface Progress {
  usecase_id: string
  completion_percentage: number
  is_completed: boolean
  answered_questions: number
  total_questions: number
}

export interface Tooltip {
  title: string
  shortContent: string
  fullContent?: string
  icon?: string
}

export interface QuestionOption {
  code: string
  label: string
  score_impact?: number
  category_impacts?: Record<string, number>
  is_eliminatory?: boolean
  unique_answer?: boolean
  tooltip?: Tooltip
  /** Niveau de risque issu du référentiel JSON (moteur juridique / V2 BPGV) */
  risk?: string
}

export interface Question {
  id: string
  question: string
  type: 'radio' | 'checkbox' | 'tags' | 'conditional'
  options: QuestionOption[]
  required: boolean
  conditionalFields?: { key: string, label: string, placeholder?: string }[]
  tooltip?: Tooltip
  /** Mode d'impact pour les questions checkbox/tags: 'any' = impact unique si au moins une option sélectionnée */
  impact_mode?: 'any' | 'cumulative'
}

export interface QuestionnaireData {
  currentQuestionId: string
  answers: Record<string, any>
  isCompleted: boolean
}

export interface QuestionProgress {
  current: number
  total: number
  percentage: number
}

export type QuestionAnswer = string | string[] | {
  selected: string
  conditionalValues?: Record<string, string>
}

// Nouveaux types pour le système de scoring
export interface CategoryScore {
  category_id: string
  category_name: string
  score: number
  max_score: number
  percentage: number
  question_count: number
  color: string
  icon: string
  /** Questionnaire V2 : aucune question active pour cette catégorie (pas de 100 % implicite). */
  evaluation_status?: 'evaluated' | 'not_evaluated'
}

export interface UseCaseScore {
  id?: string
  usecase_id: string
  score: number
  max_score: number
  score_breakdown: ScoreBreakdown[]
  category_scores: CategoryScore[]
  calculated_at: string
  version: number
  is_eliminated?: boolean
  compl_ai_bonus?: number
  compl_ai_score?: number | null
  model_info?: {
    id: string
    name: string
    provider: string
  } | null
  // Score "Risque Cas d'Usage" calculé par reverse engineering (pour affichage uniquement)
  risk_use_case?: {
    points: number
    percentage: number
    max_points: number
  }
  /** Métadonnées questionnaire V2 (calcul serveur). */
  questionnaire_version?: number
  bpgv_variant?: string | null
  ors_exit?: string | null
  active_question_codes?: string[]
}

export interface ScoreBreakdown {
  question_id: string
  question_text: string
  answer_value: any
  score_impact: number
  reasoning: string
  risk_category?: string
  category_impacts?: Record<string, number>
}

export interface ScoreCategory {
  category: string
  color: string
  description: string
  icon: string
}

export interface ScoreRule {
  questionId: string
  rules: {
    [answerCode: string]: number
  }
} 