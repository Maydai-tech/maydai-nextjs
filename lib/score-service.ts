import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Interface pour la réponse de l'edge function calculate-usecase-score
 */
export interface ScoreCalculationResponse {
  success: boolean
  usecase_id: string
  scores: {
    score_base: number
    score_model: number
    score_final: number
    is_eliminated: boolean
    elimination_reason?: string
  }
  calculation_details: {
    base_score: number
    total_impact: number
    final_base_score: number
    model_bonus: number
    max_possible_score: number
  }
}

/**
 * Interface pour les erreurs de l'edge function
 */
export interface ScoreCalculationError {
  error: string
}

/**
 * Service pour appeler l'edge function de calcul du score
 */
export class ScoreService {
  private supabase: ReturnType<typeof createClient>

  constructor(accessToken?: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    })
  }

  /**
   * Calcule le score d'un use case via l'edge function
   * @param usecaseId - ID du use case à calculer
   * @returns Promise avec le résultat du calcul
   */
  async calculateUseCaseScore(usecaseId: string): Promise<ScoreCalculationResponse> {
    try {
      const { data, error } = await this.supabase.functions.invoke('calculate-usecase-score', {
        body: {
          usecase_id: usecaseId
        }
      })

      if (error) {
        throw new Error(`Edge function error: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Score calculation failed')
      }

      return data as ScoreCalculationResponse
    } catch (error) {
      console.error('Error calling calculate-usecase-score edge function:', error)
      throw error
    }
  }

  /**
   * Version statique pour utilisation côté serveur avec un token d'accès
   */
  static async calculateScore(usecaseId: string, accessToken: string): Promise<ScoreCalculationResponse> {
    const service = new ScoreService(accessToken)
    return service.calculateUseCaseScore(usecaseId)
  }
}

/**
 * Instance par défaut du service (côté client)
 */
export const scoreService = new ScoreService()

/**
 * Fonction utilitaire pour appeler le calcul de score côté serveur
 * @param usecaseId - ID du use case
 * @param accessToken - Token d'authentification
 * @returns Promise avec le résultat du calcul
 */
export async function calculateUseCaseScore(
  usecaseId: string, 
  accessToken: string
): Promise<ScoreCalculationResponse> {
  return ScoreService.calculateScore(usecaseId, accessToken)
}