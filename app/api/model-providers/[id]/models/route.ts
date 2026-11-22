import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { visibleModelsForQuery, type SearchableModel } from '@/lib/bench-llm/model-lineage'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { id: providerId } = await params
    
    // Validate provider ID
    if (!providerId || isNaN(Number(providerId))) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 })
    }
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    const modelSelect = 'id, model_name, model_type, version, notes_short, notes_long, variants, launch_date, reference_model_id, merged_into_id, lifecycle_status, license_class, license_eu_restricted'
    const { data: visibleModels, error: modelsError } = await supabase
      .from('compl_ai_models_visible')
      .select(modelSelect)
      .eq('model_provider_id', providerId)
      .order('launch_date', { ascending: false, nullsFirst: false })
      .order('model_name', { ascending: true })

    if (modelsError) {
      console.error('Error fetching models:', modelsError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des modèles' },
        { status: 500 }
      )
    }

    const visibleRows = visibleModels ?? []
    const [{ data: variants }, { data: aliases }] = await Promise.all([
      supabase
        .from('compl_ai_models')
        .select('id, model_name, reference_model_id, merged_into_id')
        .eq('model_provider_id', providerId)
        .not('reference_model_id', 'is', null),
      supabase
        .from('llm_model_aliases')
        .select('model_id, raw_name, normalized_name'),
    ])
    const searchableVisible: SearchableModel[] = visibleRows.map((model) => ({
      id: model.id,
      modelName: model.model_name,
      referenceModelId: model.reference_model_id,
      mergedIntoId: model.merged_into_id,
    }))
    const labelsById = new Map<string, string[]>()
    const remember = (modelId: string, label: string) => {
      const current = labelsById.get(modelId) ?? []
      current.push(label)
      labelsById.set(modelId, current)
    }
    for (const variant of variants ?? []) {
      if (variant.reference_model_id) remember(variant.reference_model_id, variant.model_name)
    }
    for (const alias of aliases ?? []) remember(alias.model_id, alias.raw_name)
    const withLabels = visibleRows.map((model) => ({
      ...model,
      search_labels: labelsById.get(model.id) ?? [],
    }))
    if (!query) return NextResponse.json(withLabels)

    const matchedIds = new Set(visibleModelsForQuery({
      visible: searchableVisible,
      variants: (variants ?? []).map((model) => ({
        id: model.id,
        modelName: model.model_name,
        referenceModelId: model.reference_model_id,
        mergedIntoId: model.merged_into_id,
      })),
      aliases: (aliases ?? []).map((alias) => ({
        modelId: alias.model_id,
        names: [alias.raw_name, alias.normalized_name],
      })),
      query,
    }).map((model) => model.id))
    return NextResponse.json(withLabels.filter((model) => matchedIds.has(model.id)))
  } catch (error) {
    console.error('Error in model-providers/[id]/models API:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}