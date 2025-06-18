import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select('company_id')
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

    // Récupérer les réponses
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecaseId)
      .order('created_at', { ascending: false })

    if (responsesError) {
      return NextResponse.json({ error: 'Error fetching responses' }, { status: 500 })
    }

    return NextResponse.json(responses || [])
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
    const body = await request.json()
    const { question_code, response_value, response_data } = body

    if (!question_code) {
      return NextResponse.json({ error: 'question_code is required' }, { status: 400 })
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

    // Vérifier que l'utilisateur appartient à la même entreprise
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.company_id !== usecase.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Vérifier si une réponse existe déjà pour cette question
    const { data: existingResponse, error: existingError } = await supabase
      .from('usecase_responses')
      .select('id')
      .eq('usecase_id', usecaseId)
      .eq('question_code', question_code)
      .single()

    let result
    if (existingResponse) {
      // Mettre à jour la réponse existante
      result = await supabase
        .from('usecase_responses')
        .update({
          response_value,
          response_data,
          answered_by: user.email,
          answered_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single()
    } else {
      // Créer une nouvelle réponse
      result = await supabase
        .from('usecase_responses')
        .insert({
          usecase_id: usecaseId,
          question_code,
          response_value,
          response_data,
          answered_by: user.email,
          answered_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: 'Error saving response' }, { status: 500 })
    }

    return NextResponse.json(result.data)
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
    const body = await request.json()
    const { responses } = body

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

    // Vérifier que l'utilisateur appartient à la même entreprise
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || profile.company_id !== usecase.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const savedResponses = []

    // Traiter chaque réponse
    for (const response of responses) {
      const { question_code, response_value, response_data } = response

      if (!question_code) {
        continue // Skip invalid responses
      }

      // Vérifier si une réponse existe déjà
      const { data: existingResponse } = await supabase
        .from('usecase_responses')
        .select('id')
        .eq('usecase_id', usecaseId)
        .eq('question_code', question_code)
        .single()

      let result
      if (existingResponse) {
        // Mettre à jour
        result = await supabase
          .from('usecase_responses')
          .update({
            response_value,
            response_data,
            answered_by: user.email,
            answered_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id)
          .select()
          .single()
      } else {
        // Créer
        result = await supabase
          .from('usecase_responses')
          .insert({
            usecase_id: usecaseId,
            question_code,
            response_value,
            response_data,
            answered_by: user.email,
            answered_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.data) {
        savedResponses.push(result.data)
      }
    }

    return NextResponse.json({ saved_responses: savedResponses })
  } catch (error) {
    console.error('Error in PUT /api/usecases/[id]/responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 