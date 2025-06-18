import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id: usecaseId } = await params

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id, status')
      .eq('id', usecaseId)
      .single()

    if (usecaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur appartient à la même entreprise
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.company_id !== usecase.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer les réponses existantes
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('question_code')
      .eq('usecase_id', usecaseId)

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    // Calculer la progression
    const totalQuestions = 19 // Nombre total de questions dans QUESTIONS
    const answeredQuestions = responses ? responses.length : 0
    const completionPercentage = Math.round((answeredQuestions / totalQuestions) * 100)
    
    const progress = {
      usecase_id: usecaseId,
      completion_percentage: completionPercentage,
      is_completed: usecase.status === 'completed',
      answered_questions: answeredQuestions,
      total_questions: totalQuestions,
      status: usecase.status,
      answered_question_codes: responses ? responses.map(r => r.question_code) : []
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error in GET /api/usecases/[id]/progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 