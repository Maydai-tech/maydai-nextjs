import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const allowedDocTypes = new Set([
  'system_prompt',
  'technical_documentation',
  'human_oversight',
  'transparency_marking',
  'risk_management',
  'data_quality',
  'continuous_monitoring',
])

async function getClientFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'No authorization header' }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token' }
  return { supabase, user }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ usecaseId: string, docType: string }> }
) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { usecaseId, docType } = await params
    if (!allowedDocTypes.has(docType)) {
      return NextResponse.json({ error: 'Invalid docType' }, { status: 400 })
    }

    // Ensure user has access to the usecase's company
    const { data: dossierRow } = await supabase
      .from('dossiers')
      .select('id, company_id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    if (!dossierRow) {
      return NextResponse.json({ textContent: null, fileUrl: null, status: 'incomplete', updatedAt: null })
    }

    const { data: access } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('company_id', dossierRow.company_id)
      .maybeSingle()

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: doc } = await supabase
      .from('dossier_documents')
      .select('text_content, file_url, status, updated_at')
      .eq('dossier_id', dossierRow.id)
      .eq('doc_type', docType)
      .maybeSingle()

    return NextResponse.json({
      textContent: doc?.text_content ?? null,
      fileUrl: doc?.file_url ?? null,
      status: doc?.status ?? 'incomplete',
      updatedAt: doc?.updated_at ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ usecaseId: string, docType: string }> }
) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { usecaseId, docType } = await params
    if (!allowedDocTypes.has(docType)) {
      return NextResponse.json({ error: 'Invalid docType' }, { status: 400 })
    }

    const body = await request.json()
    const textContent: string | undefined = body?.textContent
    const status: 'incomplete' | 'complete' | 'validated' | undefined = body?.status

    // Find or create dossier
    const { data: existingDossier } = await supabase
      .from('dossiers')
      .select('id, company_id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    let dossierId = existingDossier?.id

    if (!dossierId) {
      // Get usecase to know company
      const { data: usecase } = await supabase
        .from('usecases')
        .select('company_id')
        .eq('id', usecaseId)
        .maybeSingle()

      if (!usecase?.company_id) {
        return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
      }

      // Access check
      const { data: access } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('company_id', usecase.company_id)
        .maybeSingle()

      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { data: inserted, error: insErr } = await supabase
        .from('dossiers')
        .insert({ usecase_id: usecaseId, company_id: usecase.company_id })
        .select('id')
        .single()

      if (insErr) {
        return NextResponse.json({ error: 'Failed to create dossier' }, { status: 500 })
      }
      dossierId = inserted.id
    } else {
      // Access check on existing dossier
      const { data: access } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('company_id', existingDossier.company_id)
        .maybeSingle()
      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Upsert doc
    const payload: any = {
      dossier_id: dossierId,
      doc_type: docType,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (typeof textContent === 'string') payload.text_content = textContent
    if (status) payload.status = status

    // Try update first
    const { data: existingDoc } = await supabase
      .from('dossier_documents')
      .select('id')
      .eq('dossier_id', dossierId)
      .eq('doc_type', docType)
      .maybeSingle()

    if (existingDoc?.id) {
      const { error: upErr } = await supabase
        .from('dossier_documents')
        .update(payload)
        .eq('id', existingDoc.id)
      if (upErr) return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    } else {
      const { error: insDocErr } = await supabase
        .from('dossier_documents')
        .insert(payload)
      if (insDocErr) return NextResponse.json({ error: 'Failed to insert document' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


