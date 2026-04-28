import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isChecklistGovEnterpriseQuestionCode,
  isChecklistGovUsecaseQuestionCode,
} from '@/app/usecases/[id]/utils/bpgv-transparency-checklist-save'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function isE4E5E6QuestionCode(code: string): boolean {
  return code.startsWith('E4.') || code.startsWith('E5.') || code.startsWith('E6.')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

// GET: Récupérer les réponses d'un use case
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

    const { id: usecaseId } = await params

    // Vérifier que l'utilisateur a accès à ce use case (+ checklists pour fusion identique au scoring)
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id, checklist_gov_enterprise, checklist_gov_usecase')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur a accès à l'entreprise du use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Filtre optionnel par question_code (réduit la charge pour interdit_1, etc.)
    const rawCodes = request.nextUrl.searchParams.get('question_codes')
    let codesFilter: string[] | null = null
    if (rawCodes) {
      const parts = rawCodes
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
      const safe = parts.filter((c) => /^[A-Za-z0-9._]+$/.test(c))
      if (safe.length > 0 && safe.length <= 50) {
        codesFilter = safe
      }
    }

    let responsesQuery = supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecaseId)

    if (codesFilter) {
      responsesQuery = responsesQuery.in('question_code', codesFilter)
    }

    const { data: responses, error: responsesError } = await responsesQuery.order(
      'created_at',
      { ascending: false },
    )

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    const checklistEnt = normalizeStringArray(
      (usecase as { checklist_gov_enterprise?: unknown }).checklist_gov_enterprise
    )
    const checklistUc = normalizeStringArray(
      (usecase as { checklist_gov_usecase?: unknown }).checklist_gov_usecase
    )

    const mergedRows = mergeChecklistIntoDbResponseRows(
      responses ?? [],
      checklistEnt.length > 0 ? checklistEnt : null,
      checklistUc.length > 0 ? checklistUc : null
    )

    const withUsecaseId = mergedRows.map((row) => ({
      ...row,
      usecase_id: (row as { usecase_id?: string | null }).usecase_id ?? usecaseId,
    }))

    if (codesFilter && codesFilter.length > 0) {
      const allowed = new Set(codesFilter)
      return NextResponse.json(withUsecaseId.filter((r) => r.question_code && allowed.has(r.question_code)))
    }

    return NextResponse.json(withUsecaseId)
  } catch (error) {
    console.error('Error in GET /api/usecases/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Sauvegarder une réponse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
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

    const { id: usecaseId } = await params
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const {
      question_code,
      response_value,
      response_data,
      bpgv_keys,
      transparency_keys,
      checklist_gov_enterprise,
      checklist_gov_usecase,
    } = body as {
      question_code?: string
      response_value?: string
      response_data?: Record<string, unknown>
      bpgv_keys?: string[]
      transparency_keys?: string[]
      checklist_gov_enterprise?: unknown
      checklist_gov_usecase?: unknown
    }

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur a accès à l'entreprise du use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    /**
     * Nouveau payload consolidé E4/E5/E6 :
     * - { checklist_gov_enterprise: string[], checklist_gov_usecase: string[] }
     * => UPDATE direct sur `usecases`, aucun upsert dans `usecase_responses`.
     */
    if (checklist_gov_enterprise !== undefined || checklist_gov_usecase !== undefined) {
      const ent = normalizeStringArray(checklist_gov_enterprise)
      const uc = normalizeStringArray(checklist_gov_usecase)
      const { error: upErr } = await supabase
        .from('usecases')
        .update({
          checklist_gov_enterprise: ent,
          checklist_gov_usecase: uc,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', usecaseId)
      if (upErr) {
        return NextResponse.json(
          { error: 'Erreur mise à jour checklists', details: upErr.message },
          { status: 500 }
        )
      }
      return NextResponse.json({
        updated: 'usecase_checklists',
        checklist_gov_enterprise: ent,
        checklist_gov_usecase: uc,
        checklist_field: 'both',
      })
    }

    if (!question_code) {
      return NextResponse.json({ error: 'question_code is required' }, { status: 400 })
    }

    // Migration E4/E5/E6 : ne plus persister ces blocs dans `usecase_responses`.
    if (isE4E5E6QuestionCode(question_code)) {
      return NextResponse.json(
        {
          error:
            "Les blocs E4/E5/E6 sont désormais persistés via `usecases.checklist_gov_enterprise` / `usecases.checklist_gov_usecase` (payload consolidé).",
        },
        { status: 400 }
      )
    }

    /** Checklists gouvernance : UPDATE direct sur `usecases`, pas de ligne dans `usecase_responses`. */
    if (isChecklistGovEnterpriseQuestionCode(question_code)) {
      const rawKeys: string[] | null = Array.isArray(bpgv_keys)
        ? bpgv_keys
        : Array.isArray(response_data?.bpgv_keys)
          ? (response_data.bpgv_keys as string[])
          : Array.isArray(response_data?.selected_codes)
            ? (response_data.selected_codes as string[])
            : null
      if (rawKeys === null) {
        return NextResponse.json(
          {
            error:
              'Fournir bpgv_keys, response_data.bpgv_keys ou response_data.selected_codes (tableau) pour checklist_gov_enterprise',
          },
          { status: 400 }
        )
      }
      const keys = normalizeStringArray(rawKeys)
      const { data: current, error: curErr } = await supabase
        .from('usecases')
        .select('checklist_gov_usecase')
        .eq('id', usecaseId)
        .single()
      if (curErr) {
        return NextResponse.json(
          { error: 'Erreur lecture cas d’usage', details: curErr.message },
          { status: 500 }
        )
      }
      const nextUc = normalizeStringArray(current?.checklist_gov_usecase)
      const { error: upErr } = await supabase
        .from('usecases')
        .update({
          checklist_gov_enterprise: keys,
          checklist_gov_usecase: nextUc,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', usecaseId)
      if (upErr) {
        return NextResponse.json(
          { error: 'Erreur mise à jour checklist entreprise', details: upErr.message },
          { status: 500 }
        )
      }
      return NextResponse.json({
        updated: 'usecase_checklists',
        checklist_gov_enterprise: keys,
        checklist_gov_usecase: nextUc,
        checklist_field: 'enterprise',
      })
    }

    if (isChecklistGovUsecaseQuestionCode(question_code)) {
      const rawKeys: string[] | null = Array.isArray(transparency_keys)
        ? transparency_keys
        : Array.isArray(response_data?.transparency_keys)
          ? (response_data.transparency_keys as string[])
          : Array.isArray(response_data?.selected_codes)
            ? (response_data.selected_codes as string[])
            : null
      if (rawKeys === null) {
        return NextResponse.json(
          {
            error:
              'Fournir transparency_keys, response_data.transparency_keys ou response_data.selected_codes (tableau) pour checklist_gov_usecase',
          },
          { status: 400 }
        )
      }
      const keys = normalizeStringArray(rawKeys)
      const { data: current, error: curErr } = await supabase
        .from('usecases')
        .select('checklist_gov_enterprise')
        .eq('id', usecaseId)
        .single()
      if (curErr) {
        return NextResponse.json(
          { error: 'Erreur lecture cas d’usage', details: curErr.message },
          { status: 500 }
        )
      }
      const nextEnt = normalizeStringArray(current?.checklist_gov_enterprise)
      const { error: upErr } = await supabase
        .from('usecases')
        .update({
          checklist_gov_enterprise: nextEnt,
          checklist_gov_usecase: keys,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', usecaseId)
      if (upErr) {
        return NextResponse.json(
          { error: 'Erreur mise à jour checklist cas d’usage', details: upErr.message },
          { status: 500 }
        )
      }
      return NextResponse.json({
        updated: 'usecase_checklists',
        checklist_gov_enterprise: nextEnt,
        checklist_gov_usecase: keys,
        checklist_field: 'usecase',
      })
    }

    // Préparer les données selon le type de réponse
    const updateData: any = {
      usecase_id: usecaseId,
      question_code,
      answered_by: user.email,
      answered_at: new Date().toISOString(),
      // Reset toutes les colonnes
      single_value: null,
      multiple_codes: null,
      multiple_labels: null,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null
    }

    if (response_data?.selected_codes) {
      // Réponse multiple
      updateData.multiple_codes = response_data.selected_codes
      updateData.multiple_labels = response_data.selected_labels || response_data.selected_codes
    } else if (response_data && typeof response_data === 'object' && response_data.selected) {
      // Réponse conditionnelle
      updateData.conditional_main = response_data.selected
      if (response_data.conditionalValues) {
        updateData.conditional_keys = Object.keys(response_data.conditionalValues)
        updateData.conditional_values = Object.values(response_data.conditionalValues)
      }
    } else if (response_value) {
      // Réponse simple
      updateData.single_value = response_value
    } else if (response_data) {
      // Fallback: traiter response_data comme une réponse simple
      updateData.single_value = typeof response_data === 'string' ? response_data : String(response_data)
    } else {
      // Aucune donnée valide
      console.error('No valid response data provided:', { question_code, response_value, response_data })
      return NextResponse.json({ error: 'No valid response data provided' }, { status: 400 })
    }

    console.log('Attempting to save updateData:', updateData)

    // Manual upsert: first check if record exists, then insert or update
    // This avoids PostgREST schema cache issues with onConflict
    const { data: existingResponse } = await supabase
      .from('usecase_responses')
      .select('id')
      .eq('usecase_id', usecaseId)
      .eq('question_code', question_code)
      .single()

    let data, error
    if (existingResponse) {
      // Update existing record
      const result = await supabase
        .from('usecase_responses')
        .update(updateData)
        .eq('usecase_id', usecaseId)
        .eq('question_code', question_code)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Insert new record
      const result = await supabase
        .from('usecase_responses')
        .insert(updateData)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Supabase error details:', {
        error,
        updateData,
        question_code,
        response_value,
        response_data
      })
      return NextResponse.json({
        error: 'Error saving response',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/usecases/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Mettre à jour plusieurs réponses à la fois
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
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

    const { id: usecaseId } = await params
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { responses, checklist_gov_enterprise, checklist_gov_usecase } = body as {
      responses?: unknown
      checklist_gov_enterprise?: unknown
      checklist_gov_usecase?: unknown
    }

    if (!Array.isArray(responses)) {
      return NextResponse.json({ error: 'responses must be an array' }, { status: 400 })
    }

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur a accès à l'entreprise du use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Payload consolidé (optionnel) : mise à jour directe avant batch.
    if (checklist_gov_enterprise !== undefined || checklist_gov_usecase !== undefined) {
      const ent = normalizeStringArray(checklist_gov_enterprise)
      const uc = normalizeStringArray(checklist_gov_usecase)
      const { error: upErr } = await supabase
        .from('usecases')
        .update({
          checklist_gov_enterprise: ent,
          checklist_gov_usecase: uc,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', usecaseId)
      if (upErr) {
        return NextResponse.json(
          { error: 'Erreur mise à jour checklists', details: upErr.message },
          { status: 500 }
        )
      }
    }

    const savedResponses = []

    // Traiter chaque réponse
    for (const response of responses) {
      const { question_code, response_value, response_data, bpgv_keys, transparency_keys } = response

      if (!question_code) {
        continue // Skip invalid responses
      }

      // Migration E4/E5/E6 : ne plus persister ces blocs dans `usecase_responses`.
      if (isE4E5E6QuestionCode(question_code)) {
        continue
      }

      // Préparer les données selon le type de réponse
      const updateData: any = {
        usecase_id: usecaseId,
        question_code,
        answered_by: user.email,
        answered_at: new Date().toISOString(),
        // Reset toutes les colonnes
        single_value: null,
        multiple_codes: null,
        multiple_labels: null,
        conditional_main: null,
        conditional_keys: null,
        conditional_values: null
      }

      if (isChecklistGovEnterpriseQuestionCode(question_code)) {
        const rawKeys: string[] | null = Array.isArray(bpgv_keys)
          ? bpgv_keys
          : Array.isArray(response_data?.bpgv_keys)
            ? (response_data.bpgv_keys as string[])
            : Array.isArray(response_data?.selected_codes)
              ? (response_data.selected_codes as string[])
              : null
        if (rawKeys === null) continue
        const keys = normalizeStringArray(rawKeys)
        const { data: current, error: curErr } = await supabase
          .from('usecases')
          .select('checklist_gov_usecase')
          .eq('id', usecaseId)
          .single()
        if (curErr) {
          console.error('PUT checklist entreprise — lecture usecase:', curErr)
          continue
        }
        const nextUc = normalizeStringArray(current?.checklist_gov_usecase)
        const { error: upErr } = await supabase
          .from('usecases')
          .update({
            checklist_gov_enterprise: keys,
            checklist_gov_usecase: nextUc,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', usecaseId)
        if (!upErr) {
          savedResponses.push({
            question_code,
            updated: 'usecase_checklists',
            checklist_gov_enterprise: keys,
            checklist_gov_usecase: nextUc,
          })
        }
        continue
      }

      if (isChecklistGovUsecaseQuestionCode(question_code)) {
        const rawKeys: string[] | null = Array.isArray(transparency_keys)
          ? transparency_keys
          : Array.isArray(response_data?.transparency_keys)
            ? (response_data.transparency_keys as string[])
            : Array.isArray(response_data?.selected_codes)
              ? (response_data.selected_codes as string[])
              : null
        if (rawKeys === null) continue
        const keys = normalizeStringArray(rawKeys)
        const { data: current, error: curErr } = await supabase
          .from('usecases')
          .select('checklist_gov_enterprise')
          .eq('id', usecaseId)
          .single()
        if (curErr) {
          console.error('PUT checklist cas d’usage — lecture usecase:', curErr)
          continue
        }
        const nextEnt = normalizeStringArray(current?.checklist_gov_enterprise)
        const { error: upErr } = await supabase
          .from('usecases')
          .update({
            checklist_gov_enterprise: nextEnt,
            checklist_gov_usecase: keys,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', usecaseId)
        if (!upErr) {
          savedResponses.push({
            question_code,
            updated: 'usecase_checklists',
            checklist_gov_enterprise: nextEnt,
            checklist_gov_usecase: keys,
          })
        }
        continue
      }

      if (response_data?.selected_codes) {
        // Réponse multiple
        updateData.multiple_codes = response_data.selected_codes
        updateData.multiple_labels = response_data.selected_labels || response_data.selected_codes
      } else if (response_data && typeof response_data === 'object' && response_data.selected) {
        // Réponse conditionnelle
        updateData.conditional_main = response_data.selected
        if (response_data.conditionalValues) {
          updateData.conditional_keys = Object.keys(response_data.conditionalValues)
          updateData.conditional_values = Object.values(response_data.conditionalValues)
        }
      } else if (response_value) {
        // Réponse simple
        updateData.single_value = response_value
      } else if (response_data) {
        // Fallback: traiter response_data comme une réponse simple
        updateData.single_value = typeof response_data === 'string' ? response_data : String(response_data)
      } else {
        // Skip cette réponse si pas de données valides
        console.log('Skipping response with no valid data:', { question_code, response_value, response_data })
        continue
      }

      // Manual upsert: first check if record exists, then insert or update
      const { data: existingResponse } = await supabase
        .from('usecase_responses')
        .select('id')
        .eq('usecase_id', usecaseId)
        .eq('question_code', question_code)
        .single()

      let data, error
      if (existingResponse) {
        // Update existing record
        const result = await supabase
          .from('usecase_responses')
          .update(updateData)
          .eq('usecase_id', usecaseId)
          .eq('question_code', question_code)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // Insert new record
        const result = await supabase
          .from('usecase_responses')
          .insert(updateData)
          .select()
          .single()
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('Supabase error in batch save:', {
          error,
          question_code,
          updateData
        })
      } else if (data) {
        savedResponses.push(data)
      }
    }

    return NextResponse.json({ saved_responses: savedResponses })
  } catch (error) {
    console.error('Error in PUT /api/usecases/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 