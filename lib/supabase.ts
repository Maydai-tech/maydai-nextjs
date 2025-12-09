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

// Export de la fonction createClient pour les API routes
export { createClient } from '@supabase/supabase-js'

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
  primary_model_id?: string
  ai_category?: string
  system_type?: string
  deployment_countries?: string[]
  service_id?: string
  company_status?: 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown'  // NOUVEAU: Statut d'entreprise
  report_summary?: string  // NOUVEAU: Rapport d'analyse IA généré
  report_generated_at?: string  // NOUVEAU: Date de génération du rapport
  created_at: string
  updated_at: string
}

// Type enrichi pour les cas d'usage avec informations du modèle COMPL-AI
export interface UseCaseWithModel extends UseCase {
  model_name?: string
  model_provider?: string
  model_type?: string
  model_version?: string
  compl_ai_score?: number
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

// Types pour les données COMPL-AI
export interface ComplAIPrinciple {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  created_at: string
  updated_at: string
}

export interface ComplAIModel {
  id: string
  model_name: string
  model_provider?: string
  model_type?: string
  version?: string
  short_name?: string
  long_name?: string
  launch_date?: string
  model_provider_id?: number
  notes_short?: string
  notes_long?: string
  variants?: string[]
  created_at: string
  updated_at: string
}

export interface ComplAIBenchmark {
  id: string
  principle_id: string
  name: string
  code: string
  description?: string
  metric_type?: string
  min_value: number
  max_value: number
  created_at: string
  updated_at: string
}

export interface ComplAIEvaluation {
  id: string
  model_id: string
  principle_id: string
  benchmark_id?: string
  score?: number
  score_text?: string
  rang_compar_ia?: number
  evaluation_date: string
  data_source: string
  raw_data?: any
  maydai_score?: number
  created_at: string
  updated_at: string
}

export interface ComplAISyncLog {
  id: string
  sync_date: string
  status: 'success' | 'error' | 'partial'
  models_synced: number
  evaluations_synced: number
  error_message?: string
  execution_time_ms?: number
  created_at: string
}

// Type pour les fournisseurs de modèles IA avec infobulles
export interface ModelProvider {
  id: number
  name: string
  tooltip_title?: string
  tooltip_short_content?: string
  tooltip_full_content?: string
  tooltip_icon?: string
  tooltip_rank?: number
  tooltip_rank_text?: string
  created_at?: string
  updated_at?: string
}

// Types pour l'API Edge Function
export interface ComplAISyncResponse {
  success: boolean
  sync_date: string
  execution_time_ms: number
  categories_processed: number
  models_synced: number
  evaluations_created: number
  errors: string[]
}

// Types pour les scores agrégés (futures tables simplifiées)
export interface ComplAICategoryScore {
  id: string
  model_name: string
  category_id: string
  average_score: number
  benchmarks_count: number
  evaluation_date: string
  created_at: string
  updated_at: string
}

export interface ComplAIScore {
  id: string
  model_name: string
  overall_score: number
  evaluation_date: string
  created_at: string
  updated_at: string
} // Types pour la table usecase_nextsteps
export interface UseCaseNextSteps {
  id: string
  usecase_id: string
  
  // Sections fixes (toujours présentes)
  introduction?: string
  evaluation?: string
  impact?: string
  conclusion?: string
  
  // Actions réglementaires et documents techniques
  priorite_1?: string
  priorite_2?: string
  priorite_3?: string
  
  // Quick wins & actions immédiates
  quick_win_1?: string
  quick_win_2?: string
  quick_win_3?: string
  
  // Actions à moyen terme
  action_1?: string
  action_2?: string
  action_3?: string
  
  // Métadonnées
  generated_at: string
  model_version?: string
  processing_time_ms?: number
  
  // Audit
  created_at: string
  updated_at: string
}

// Interface pour l'insertion/mise à jour
export interface UseCaseNextStepsInput {
  usecase_id: string
  introduction?: string
  evaluation?: string
  impact?: string
  conclusion?: string
  priorite_1?: string
  priorite_2?: string
  priorite_3?: string
  quick_win_1?: string
  quick_win_2?: string
  quick_win_3?: string
  action_1?: string
  action_2?: string
  action_3?: string
  model_version?: string
  processing_time_ms?: number
}

/**
 * Récupère les données nextsteps pour un cas d'usage spécifique via l'API
 */
export async function getUseCaseNextSteps(usecaseId: string): Promise<UseCaseNextSteps | null> {
  try {
    // Récupérer le token d'authentification
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      console.error('Aucun token d\'authentification trouvé')
      return null
    }

    // Appeler l'API avec l'autorisation
    const response = await fetch(`/api/usecases/${usecaseId}/nextsteps`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 404) {
      // Aucun enregistrement trouvé
      return null
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erreur API nextsteps:', errorData)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erreur lors de la récupération des nextsteps:', error)
    return null
  }
}

/**
 * Récupère les données nextsteps pour plusieurs cas d'usage
 */
export async function getMultipleUseCaseNextSteps(usecaseIds: string[]): Promise<Record<string, UseCaseNextSteps>> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      console.error('Aucun token d\'authentification trouvé')
      return {}
    }

    // Récupérer les nextSteps pour chaque cas d'usage individuellement
    const nextStepsMap: Record<string, UseCaseNextSteps> = {}
    
           for (const usecaseId of usecaseIds) {
             try {
               const response = await fetch(`/api/usecases/${usecaseId}/nextsteps`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          nextStepsMap[usecaseId] = data
        } else if (response.status !== 404) {
          console.error(`Erreur API nextsteps pour ${usecaseId}:`, response.status)
        }
      } catch (err) {
        console.error(`Erreur lors de la récupération des nextSteps pour ${usecaseId}:`, err)
      }
    }

    return nextStepsMap
  } catch (error) {
    console.error('Erreur lors de la récupération des nextsteps multiples:', error)
    return {}
  }
}