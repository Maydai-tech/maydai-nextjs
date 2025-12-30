import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import type { BenchLLMModel, SortableColumn } from '@/lib/types/bench-llm'

export async function GET(request: NextRequest) {
  try {
    // Authentification
    const { supabase } = await getAuthenticatedSupabaseClient(request)

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const sortBy = (searchParams.get('sortBy') || 'model_name') as SortableColumn
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    // Filtres
    const provider = searchParams.get('provider')?.split(',').filter(Boolean)
    const license = searchParams.get('license')?.split(',').filter(Boolean)
    const size = searchParams.get('size')?.split(',').filter(Boolean)
    const multimodal = searchParams.get('multimodal') === 'true'
    const open = searchParams.get('open') === 'true'
    const longContext = searchParams.get('longContext') === 'true'
    const small = searchParams.get('small') === 'true'
    const searchTerm = searchParams.get('searchTerm')?.trim()

    // Calcul de l'offset
    const offset = (page - 1) * limit

    // Construction de la requête de base
    let query = supabase
      .from('compl_ai_models')
      .select('*', { count: 'exact' })

    // Application des filtres
    if (provider && provider.length > 0) {
      query = query.in('model_provider', provider)
    }

    if (license && license.length > 0) {
      query = query.in('license', license)
    }

    if (size && size.length > 0) {
      query = query.in('model_size', size)
    }

    if (open) {
      query = query.eq('license', 'Open')
    }

    if (small) {
      query = query.in('model_size', ['XS', 'S'])
    }

    if (longContext) {
      query = query.gt('context_length', 100000)
    }

      if (multimodal) {
        // Filtrer les modèles multimodaux par model_type
        query = query.or('model_type.ilike.%multimodal%,model_type.ilike.%vision%')
      }

    if (searchTerm) {
      query = query.ilike('model_name', `%${searchTerm}%`)
    }

    // Application du tri
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending, nullsFirst: false })

    // Application de la pagination
    query = query.range(offset, offset + limit - 1)

    // Exécution de la requête
    const { data, error, count } = await query

    // Logs pour déboguer
    console.log('Bench LLM API - Query params:', { page, limit, sortBy, sortOrder })
    console.log('Bench LLM API - Results:', { count: count || 0, dataLength: data?.length || 0 })
    if (data && data.length > 0) {
      console.log('Bench LLM API - First model:', data[0].model_name, 'compl_ai_rank:', data[0].compl_ai_rank)
    }

    if (error) {
      console.error('Error fetching bench LLM models:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des modèles', details: error.message },
        { status: 500 }
      )
    }

    // Formatage des données
    const models: BenchLLMModel[] = (data || []).map((model: any) => ({
      id: model.id,
      model_name: model.model_name,
      model_provider: model.model_provider,
      country: model.country,
      llm_leader_rank: model.llm_leader_rank,
      compl_ai_rank: model.compl_ai_rank,
      comparia_rank: model.comparia_rank,
      input_cost_per_million: model.input_cost_per_million,
      output_cost_per_million: model.output_cost_per_million,
      model_size: model.model_size,
      gpqa_score: model.gpqa_score,
      aime_2025_score: model.aime_2025_score,
      license: model.license,
      context_length: model.context_length,
      consumption_wh_per_1k_tokens: model.consumption_wh_per_1k_tokens,
      release_date: model.release_date,
      knowledge_cutoff: model.knowledge_cutoff,
      created_at: model.created_at,
      updated_at: model.updated_at,
    }))

    // Calcul de la pagination
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      models,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error in bench-llm models API:', error)

    // Gestion des erreurs d'authentification
    if (error instanceof Error && (error.message === 'No authorization header' || error.message === 'Invalid token')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 }
    )
  }
}

