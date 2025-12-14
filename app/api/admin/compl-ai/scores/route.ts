import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Authentification via le client Supabase authentifié
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Vérifier les droits admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    // Récupérer les données du score
    const { modelId, benchmarkCode, score } = await request.json()

    if (!modelId || !benchmarkCode || typeof score !== 'number') {
      return NextResponse.json({ error: 'Model ID, benchmark code et score sont requis' }, { status: 400 })
    }

    if (score < 0 || score > 1) {
      return NextResponse.json({ error: 'Le score doit être entre 0 et 1' }, { status: 400 })
    }

    // Vérifier que le modèle existe
    const { data: model } = await supabase
      .from('compl_ai_models')
      .select('id')
      .eq('id', modelId)
      .single()

    if (!model) {
      return NextResponse.json({ error: 'Modèle non trouvé' }, { status: 404 })
    }

    // Récupérer le benchmark par son code
    const { data: benchmark } = await supabase
      .from('compl_ai_benchmarks')
      .select('id, name, principle_id')
      .eq('code', benchmarkCode)
      .single()

    if (!benchmark) {
      return NextResponse.json({ error: 'Benchmark non trouvé' }, { status: 404 })
    }

    // Vérifier si une évaluation existe déjà pour ce modèle et ce benchmark
    const { data: existingEvaluation } = await supabase
      .from('compl_ai_evaluations')
      .select('id')
      .eq('model_id', modelId)
      .eq('benchmark_id', benchmark.id)
      .single()

    if (existingEvaluation) {
      return NextResponse.json({ error: 'Une évaluation existe déjà pour ce modèle et ce benchmark. Utilisez PUT pour la modifier.' }, { status: 409 })
    }

    // Créer la nouvelle évaluation
    const currentDate = new Date().toISOString().split('T')[0]
    const { data: newEvaluation, error: insertError } = await supabase
      .from('compl_ai_evaluations')
      .insert({
        model_id: modelId,
        principle_id: benchmark.principle_id,
        benchmark_id: benchmark.id,
        score: score,
        score_text: `${Math.round(score * 100)}%`,
        evaluation_date: currentDate,
        data_source: 'manual-input',
        raw_data: {
          benchmark_code: benchmarkCode,
          benchmark_name: benchmark.name,
          manual_entry: true,
          entered_by: user.id,
          entry_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Erreur lors de la création de l\'évaluation: ' + insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Score ajouté avec succès',
      evaluation: newEvaluation
    })

  } catch (error) {
    console.error('Erreur création score COMPL-AI:', error)

    // Erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentification via le client Supabase authentifié
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    // Vérifier les droits admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
    }

    // Récupérer les données du score
    const { modelId, benchmarkCode, score, evaluation_id } = await request.json()

    if (!modelId || !benchmarkCode || typeof score !== 'number') {
      return NextResponse.json({ error: 'Model ID, benchmark code et score sont requis' }, { status: 400 })
    }

    if (score < 0 || score > 1) {
      return NextResponse.json({ error: 'Le score doit être entre 0 et 1' }, { status: 400 })
    }

    // Si on a un evaluation_id, on met à jour directement
    if (evaluation_id) {
      const { data: updatedEvaluation, error: updateError } = await supabase
        .from('compl_ai_evaluations')
        .update({
          score: score,
          score_text: `${Math.round(score * 100)}%`,
          updated_at: new Date().toISOString(),
          raw_data: {
            benchmark_code: benchmarkCode,
            manual_entry: true,
            last_updated_by: user.id,
            last_update_timestamp: new Date().toISOString()
          }
        })
        .eq('id', evaluation_id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'évaluation: ' + updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Score mis à jour avec succès',
        evaluation: updatedEvaluation
      })
    }

    // Sinon, rechercher l'évaluation par modèle et benchmark
    const { data: benchmark } = await supabase
      .from('compl_ai_benchmarks')
      .select('id, name')
      .eq('code', benchmarkCode)
      .single()

    if (!benchmark) {
      return NextResponse.json({ error: 'Benchmark non trouvé' }, { status: 404 })
    }

    const { data: evaluation } = await supabase
      .from('compl_ai_evaluations')
      .select('id')
      .eq('model_id', modelId)
      .eq('benchmark_id', benchmark.id)
      .single()

    if (!evaluation) {
      return NextResponse.json({ error: 'Évaluation non trouvée' }, { status: 404 })
    }

    const { data: updatedEvaluation, error: updateError } = await supabase
      .from('compl_ai_evaluations')
      .update({
        score: score,
        score_text: `${Math.round(score * 100)}%`,
        updated_at: new Date().toISOString()
      })
      .eq('id', evaluation.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'évaluation: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Score mis à jour avec succès',
      evaluation: updatedEvaluation
    })

  } catch (error) {
    console.error('Erreur modification score COMPL-AI:', error)

    // Erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
