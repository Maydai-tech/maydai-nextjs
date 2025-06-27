import { createClient } from '@supabase/supabase-js'

// Fonction pour créer le client Supabase avec validation à l'exécution
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies dans .env.local'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export du client avec lazy initialization
export const supabase = createSupabaseClient()

// Types pour la base de données
export interface QuestionnaireSection {
  id: string
  code: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuestionnaireQuestion {
  id: string
  section_id?: string
  code: string
  question_text: string
  question_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number' | 'date'
  options?: Array<string | { 
    value: string
    label: string
    next_question_id?: string 
  }>
  next_question_id?: string
  is_required: boolean
  display_order: number
  help_text?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UseCase {
  id: string
  name: string
  description?: string
  company_id?: string
  deployment_date?: string
  status: string
  risk_level?: string
  responsible_service?: string
  technology_partner?: string
  llm_model_version?: string
  ai_category?: string
  system_type?: string
  service_id?: string
  created_at: string
  updated_at: string
}

// Types pour la nouvelle structure usecase_responses avec colonnes Array
export interface UseCaseResponse {
  id: string
  usecase_id: string
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
  answered_by: string
  answered_at: string
  created_at: string
  updated_at: string
}

export interface QuestionnaireResponseInput {
  question_code: string
  single_value?: string
  multiple_data?: {
    selected_codes: string[]
    selected_labels: string[]
  }
  conditional_data?: {
    selected: string
    conditionalValues: Record<string, string>
  }
}

export interface BetaRequest {
  id: string
  full_name: string
  email: string
  phone?: string
  motivations: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
} 