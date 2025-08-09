/**
 * Interface pour la réponse de l'API de calcul du score
 */
export interface ScoreCalculationResponse {
  success: boolean
  usecase_id: string
  scores: {
    score_base: number
    score_model: number | null
    score_final: number
    is_eliminated: boolean
    elimination_reason: string
  }
  calculation_details: {
    base_score: number
    total_impact: number
    final_base_score: number
    model_score: number | null
    model_percentage: number | null
    has_model_score: boolean
    formula_used: string
    weights: {
      base_score_weight: number
      model_score_weight: number
      total_weight: number
    }
  }
}

/**
 * Interface pour les erreurs de l'API
 */
export interface ScoreCalculationError {
  error: string
  details?: string
}

/**
 * Service pour appeler l'API de calcul du score
 * 
 * Ce service utilise l'API Next.js au lieu de l'edge function Supabase
 * pour simplifier l'architecture et centraliser la logique
 */
export class ScoreService {
  private accessToken?: string

  constructor(accessToken?: string) {
    this.accessToken = accessToken
  }

  /**
   * Calcule le score d'un use case via l'API Next.js
   * 
   * @param usecaseId - ID du use case à calculer
   * @returns Promise avec le résultat du calcul
   */
  async calculateUseCaseScore(usecaseId: string): Promise<ScoreCalculationResponse> {
    try {
      // Construire l'URL de l'API
      // Utiliser une URL relative pour fonctionner côté client et serveur
      const url = `/api/usecases/${usecaseId}/calculate-score`
      
      // Préparer les headers avec le token d'authentification
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`
      }
      
      // Appeler l'API Next.js
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          usecase_id: usecaseId
        })
      })

      // Gérer les erreurs HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Parser la réponse
      const data = await response.json()
      
      return data as ScoreCalculationResponse
    } catch (error) {
      console.error('Erreur lors de l\'appel à l\'API calculate-score:', error)
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