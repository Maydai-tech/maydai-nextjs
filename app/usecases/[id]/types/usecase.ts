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
  responsible_service: string
  system_type?: string
  company_id: string
  created_at: string
  updated_at: string
  companies?: {
    name: string
    industry: string
    city: string
    country: string
  }
}

export interface Progress {
  usecase_id: string
  completion_percentage: number
  is_completed: boolean
  answered_questions: number
  total_questions: number
}

export interface QuestionOption {
  code: string
  label: string
}

export interface Question {
  id: string
  question: string
  type: 'radio' | 'checkbox' | 'tags' | 'conditional'
  options: QuestionOption[]
  required: boolean
  conditionalFields?: { label: string, placeholder?: string }[]
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