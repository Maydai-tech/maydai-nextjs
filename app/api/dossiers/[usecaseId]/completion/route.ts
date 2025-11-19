import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
  { params }: { params: Promise<{ usecaseId: string }> }
) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const { usecaseId } = await params

    // Vérifier que l'utilisateur a accès au use case via la company
    const { data: usecase } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', usecaseId)
      .maybeSingle()

    if (!usecase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    const { data: access } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('company_id', usecase.company_id)
      .maybeSingle()

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer le dossier pour ce use case
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('id')
      .eq('usecase_id', usecaseId)
      .maybeSingle()

    // Si pas de dossier, retourner 0/8
    if (!dossier) {
      return NextResponse.json({
        completed: 0,
        total: 8,
        percentage: 0
      })
    }

    // Compter les documents complétés
    const { data: documents } = await supabase
      .from('dossier_documents')
      .select('status')
      .eq('dossier_id', dossier.id)

    const completedCount = documents?.filter((doc: { status: string }) => doc.status === 'complete' || doc.status === 'validated').length || 0
    const total = 8 // Nombre total de documents requis (incluant registry_proof)
    const percentage = Math.round((completedCount / total) * 100)

    return NextResponse.json({
      completed: completedCount,
      total,
      percentage
    })
  } catch (e) {
    console.error('Error fetching completion:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
