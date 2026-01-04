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

    const savedResponses = []

    // Traiter chaque réponse
    for (const response of responses) {
      const { question_code, response_value, response_data } = response

      if (!question_code) {
        continue // Skip invalid responses
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