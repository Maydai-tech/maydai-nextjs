import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordUseCaseHistory } from '@/lib/usecase-history'
import { getRegistryOwnerPlan } from '@/lib/subscription/user-plan'
import {
  buildV2DuplicateInsertPayload,
  isEligibleV1SourceForV2Duplicate,
} from '@/lib/duplicate-v1-to-v2'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Duplique un cas d’usage **V1** vers un **nouveau** cas **V2** : métadonnées métier sûres uniquement,
 * aucune copie de `usecase_responses`, ni de `bpgv_variant` / `active_question_codes` / `ors_exit` (repart vierge).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
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
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: sourceId } = await params

    const { data: source, error: sourceError } = await supabase
      .from('usecases')
      .select(
        `
        id,
        company_id,
        name,
        description,
        deployment_date,
        deployment_phase,
        responsible_service,
        technology_partner,
        llm_model_version,
        primary_model_id,
        ai_category,
        system_type,
        deployment_countries,
        company_status,
        questionnaire_version
      `
      )
      .eq('id', sourceId)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    if (!isEligibleV1SourceForV2Duplicate(source)) {
      return NextResponse.json(
        {
          error: 'La duplication V1 → V2 n’est possible que pour un cas au parcours V1.',
          code: 'NOT_V1_SOURCE',
        },
        { status: 400 }
      )
    }

    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', source.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const ownerPlan = await getRegistryOwnerPlan(source.company_id, supabase)
    const maxUseCases = ownerPlan.planInfo.maxUseCasesPerRegistry || 3

    const { count: currentUseCaseCount, error: countError } = await supabase
      .from('usecases')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', source.company_id)

    if (countError) {
      return NextResponse.json({ error: 'Error checking use case limit' }, { status: 500 })
    }

    if ((currentUseCaseCount || 0) >= maxUseCases) {
      return NextResponse.json(
        {
          error: 'Limite du plan atteinte',
          code: 'PLAN_LIMIT_REACHED',
          limit: maxUseCases,
          current: currentUseCaseCount,
        },
        { status: 403 }
      )
    }

    const nowIso = new Date().toISOString()
    const insertPayload = buildV2DuplicateInsertPayload(source, user.id, nowIso)

    const { data: created, error: insertError } = await supabase
      .from('usecases')
      .insert([insertPayload])
      .select()
      .single()

    if (insertError || !created) {
      return NextResponse.json(
        { error: 'Error creating duplicated use case', details: insertError?.message },
        { status: 500 }
      )
    }

    await recordUseCaseHistory(supabase, created.id, user.id, 'created')

    return NextResponse.json(
      {
        usecase: created,
        source_usecase_id: sourceId,
      },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
