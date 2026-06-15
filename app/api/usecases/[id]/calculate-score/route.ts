/**
 * Route API pour calculer le score d'un cas d'usage
 *
 * Implémentation 100 % in-app (remplace l'ancienne edge function Supabase).
 * Le calcul lui-même est délégué à `lib/usecase-score-service.ts`, ce qui permet
 * de le réutiliser côté serveur (recalcul automatique lors d'un changement de
 * score de modèle) avec un client service-role.
 *
 * Endpoint: POST /api/usecases/[id]/calculate-score
 * Body: { usecase_id?: string, path_mode?: 'short' }
 *
 * Ce route conserve l'authentification + l'autorisation (accès du user au cas
 * d'usage via `user_companies`) ; le calcul/persistance est dans le service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calculateAndPersistUseCaseScore,
  UseCaseScoreError,
} from '@/lib/usecase-score-service'

/**
 * Fonction utilitaire pour créer une réponse d'erreur standardisée
 */
function createErrorResponse(message: string, status: number) {
  console.error(`❌ Erreur API: ${message}`)
  return NextResponse.json({ error: message }, { status })
}

/**
 * POST /api/usecases/[id]/calculate-score
 * Calcule et met à jour le score d'un cas d'usage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ===== ÉTAPE 1: AUTHENTIFICATION =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse("Variables d'environnement Supabase manquantes", 500)
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return createErrorResponse("Token d'authentification manquant", 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return createErrorResponse('Token invalide', 401)
    }

    // ===== ÉTAPE 2: PARAMÈTRES =====
    const { id: usecaseId } = await params

    let bodyUsecaseId: string | undefined
    let requestPathMode: 'short' | undefined
    try {
      const body = (await request.json()) as { usecase_id?: string; path_mode?: string }
      bodyUsecaseId = body.usecase_id
      if (body.path_mode === 'short') requestPathMode = 'short'
    } catch {
      // Pas de body JSON, ce n'est pas grave
    }

    const finalUsecaseId = bodyUsecaseId || usecaseId
    if (!finalUsecaseId) {
      return createErrorResponse("ID du cas d'usage requis", 400)
    }

    // ===== ÉTAPE 3: AUTORISATION (accès du user au cas d'usage) =====
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', finalUsecaseId)
      .single()

    if (usecaseError || !usecase) {
      return createErrorResponse("Cas d'usage non trouvé", 404)
    }

    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return createErrorResponse("Accès refusé à ce cas d'usage", 403)
    }

    // ===== ÉTAPE 4: CALCUL + PERSISTANCE (déléguée au service) =====
    const result = await calculateAndPersistUseCaseScore({
      client: supabase,
      usecaseId: finalUsecaseId,
      actorUserId: user.id,
      requestPathMode,
      recordHistory: true,
    })

    // ===== ÉTAPE 5: RÉPONSE (forme historique préservée) =====
    return NextResponse.json(
      {
        ...result.finalResult,
        company_status: result.company_status,
        company_status_definition: result.company_status_definition,
        classification_status: result.classification_status,
        risk_level: result.risk_level,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof UseCaseScoreError) {
      const body: { error: string; details?: string } = { error: error.message }
      if (error.details) body.details = error.details
      return NextResponse.json(body, { status: error.status })
    }

    console.error('💥 Erreur inattendue lors du calcul:', error)
    return NextResponse.json(
      {
        error: 'Erreur serveur interne',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/usecases/[id]/calculate-score
 * Méthode non supportée - utiliser POST
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Méthode non supportée',
      message: 'Utilisez POST pour calculer un score',
    },
    { status: 405 }
  )
}
