import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'

/**
 * PATCH - Mettre à jour une évaluation (notamment le score rang_compar_ia)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return authResult.error
    }

    // Créer le client Supabase avec la clé de service pour contourner RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id: evaluationId } = await params
    const body = await request.json()
    
    // Validation du score rang_compar_ia s'il est fourni
    if (body.rang_compar_ia !== undefined && body.rang_compar_ia !== null) {
      const score = parseFloat(body.rang_compar_ia)
      if (isNaN(score) || score < 0 || score > 20) {
        return NextResponse.json({ 
          error: 'Le score rang_compar_ia doit être entre 0 et 20' 
        }, { status: 400 })
      }
      body.rang_compar_ia = score
    }

    // Construire l'objet de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Ajouter les champs autorisés à la mise à jour
    if (body.rang_compar_ia !== undefined) {
      updateData.rang_compar_ia = body.rang_compar_ia
    }
    if (body.score !== undefined) {
      updateData.score = body.score
    }
    if (body.score_text !== undefined) {
      updateData.score_text = body.score_text
    }
    if (body.maydai_score !== undefined) {
      updateData.maydai_score = body.maydai_score
    }
    if (body.evaluation_date !== undefined) {
      updateData.evaluation_date = body.evaluation_date
    }
    if (body.raw_data !== undefined) {
      updateData.raw_data = body.raw_data
    }

    // Mettre à jour l'évaluation
    const { data: updatedEvaluation, error: updateError } = await supabase
      .from('compl_ai_evaluations')
      .update(updateData)
      .eq('id', evaluationId)
      .select(`
        *,
        compl_ai_models (
          id,
          model_name,
          model_provider,
          short_name,
          long_name
        ),
        compl_ai_principles (
          id,
          code,
          name
        )
      `)
      .single()

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError)
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour de l\'évaluation: ' + updateError.message 
      }, { status: 500 })
    }

    if (!updatedEvaluation) {
      return NextResponse.json({ 
        error: 'Évaluation non trouvée' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Évaluation mise à jour avec succès',
      evaluation: updatedEvaluation
    })

  } catch (error) {
    console.error('Erreur mise à jour évaluation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

/**
 * GET - Récupérer une évaluation spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification admin
    const authResult = await verifyAdminAuth(request)
    if (authResult.error) {
      return authResult.error
    }

    // Créer le client Supabase avec la clé de service pour contourner RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { id: evaluationId } = await params

    // Récupérer l'évaluation
    const { data: evaluation, error: fetchError } = await supabase
      .from('compl_ai_evaluations')
      .select(`
        *,
        compl_ai_models (
          id,
          model_name,
          model_provider,
          short_name,
          long_name,
          launch_date
        ),
        compl_ai_principles (
          id,
          code,
          name
        )
      `)
      .eq('id', evaluationId)
      .single()

    if (fetchError || !evaluation) {
      return NextResponse.json({ 
        error: 'Évaluation non trouvée' 
      }, { status: 404 })
    }

    return NextResponse.json(evaluation)

  } catch (error) {
    console.error('Erreur récupération évaluation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}








