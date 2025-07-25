import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { calculateUseCaseScore } from '@/lib/score-service'

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

    // Resolve params
    const resolvedParams = await params
    const useCaseId = resolvedParams.id

    // Fetch the use case with company and model information
    const { data: useCase, error: useCaseError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(
          id,
          name,
          industry,
          city,
          country
        ),
        compl_ai_models(
          id,
          model_name,
          model_provider,
          model_type,
          version
        )
      `)
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      const context = createRequestContext(request)
      logger.error('Failed to fetch use case', useCaseError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error fetching use case' }, { status: 500 })
    }

    // Get user's profile to check access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // Check if user has access to this use case
    // Users can access use cases from their company
    const hasAccess = profile.company_id === useCase.company_id
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(useCase)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Use case API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Resolve params
    const resolvedParams = await params
    const useCaseId = resolvedParams.id

    // Parse request body
    const body = await request.json()
    const { primary_model_id } = body

    // Validate model_id if provided
    if (primary_model_id !== null && primary_model_id !== undefined) {
      const { data: model, error: modelError } = await supabase
        .from('compl_ai_models')
        .select('id')
        .eq('id', primary_model_id)
        .single()

      if (modelError || !model) {
        return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
      }
    }

    // Get user's profile to check access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // Verify user has access to this use case
    const { data: existingUseCase, error: useCaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
    }

    if (profile.company_id !== existingUseCase.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the use case
    const { data: updatedUseCase, error: updateError } = await supabase
      .from('usecases')
      .update({ 
        primary_model_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', useCaseId)
      .select(`
        *,
        companies(
          id,
          name,
          industry,
          city,
          country
        ),
        compl_ai_models(
          id,
          model_name,
          model_provider,
          model_type,
          version
        )
      `)
      .single()

    if (updateError) {
      const context = createRequestContext(request)
      logger.error('Failed to update use case', updateError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error updating use case' }, { status: 500 })
    }

    // Déclencher le recalcul automatique du score si le modèle a été modifié
    if (primary_model_id !== undefined) {
      try {
        await calculateUseCaseScore(useCaseId, token)
        logger.info('Score recalculated successfully after model update', { useCaseId, primary_model_id })
      } catch (scoreError) {
        // Ne pas faire échouer la mise à jour du modèle si le calcul du score échoue
        const context = createRequestContext(request)
        logger.error('Failed to recalculate score after model update', scoreError, { 
          ...context, 
          useCaseId, 
          primary_model_id 
        })
      }
    }

    return NextResponse.json(updatedUseCase)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Use case PUT API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 