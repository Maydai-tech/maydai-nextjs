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

function isKebabCaseName(name: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*\.(txt|md|pdf|docx|png|jpg|jpeg|gif)$/i.test(name)
}

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

export async function PUT(
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

    const formData = await request.formData()
    const file = formData.get('file') as unknown as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = file.name
    const size = buffer.byteLength

    if (size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }
    if (!isKebabCaseName(filename)) {
      return NextResponse.json({ error: 'Invalid filename. Use kebab-case and supported extensions.' }, { status: 400 })
    }

    // Ensure dossier exists and get company
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('id, company_id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    let dossierId = dossier?.id
    let companyId = dossier?.company_id

    if (!dossierId || !companyId) {
      const { data: usecase } = await supabase
        .from('usecases')
        .select('company_id')
        .eq('id', usecaseId)
        .maybeSingle()
      if (!usecase?.company_id) {
        return NextResponse.json({ error: 'Usecase not found' }, { status: 404 })
      }
      companyId = usecase.company_id
      const { data: ins, error: insErr } = await supabase
        .from('dossiers')
        .insert({ usecase_id: usecaseId, company_id: companyId })
        .select('id')
        .single()
      if (insErr) return NextResponse.json({ error: 'Failed to create dossier' }, { status: 500 })
      dossierId = ins.id
    }

    // Verify access
    const { data: access } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    // Upload to storage bucket 'dossiers'
    const path = `${companyId}/${usecaseId}/${docType}/${filename}`
    const { error: upErr } = await (supabase as any).storage
      .from('dossiers')
      .upload(path, buffer, { upsert: true, contentType: file.type || 'application/octet-stream' })
    if (upErr) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: publicUrlData } = (supabase as any).storage
      .from('dossiers')
      .getPublicUrl(path)

    const fileUrl = publicUrlData?.publicUrl || null

    // Upsert dossier_documents with file_url
    const { data: existingDoc } = await supabase
      .from('dossier_documents')
      .select('id')
      .eq('dossier_id', dossierId)
      .eq('doc_type', docType)
      .maybeSingle()

    if (existingDoc?.id) {
      const { error: updErr } = await supabase
        .from('dossier_documents')
        .update({ file_url: fileUrl, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', existingDoc.id)
      if (updErr) return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    } else {
      const { error: insDocErr } = await supabase
        .from('dossier_documents')
        .insert({ dossier_id: dossierId, doc_type: docType, file_url: fileUrl, updated_by: user.id })
      if (insDocErr) return NextResponse.json({ error: 'Failed to insert document' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, fileUrl })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


