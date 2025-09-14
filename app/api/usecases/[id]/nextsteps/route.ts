import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'

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

    // Vérifier que l'utilisateur a accès à ce use case
    const { data: useCase, error: useCaseError } = await supabase
      .from('usecases')
      .select('company_id')
      .eq('id', useCaseId)
      .single()

    if (useCaseError) {
      if (useCaseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Use case not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Error fetching use case' }, { status: 500 })
    }

    // Check if user has access to this use case via user_companies
    const { data: userCompany, error: userCompanyError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', useCase.company_id)
      .eq('is_active', true)
      .single()

    if (userCompanyError || !userCompany) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Récupérer les next steps pour ce use case
    const { data: nextSteps, error: nextStepsError } = await supabase
      .from('usecase_nextsteps')
      .select('*')
      .eq('usecase_id', useCaseId)
      .single()

    if (nextStepsError) {
      if (nextStepsError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No next steps found' }, { status: 404 })
      }
      const context = createRequestContext(request)
      logger.error('Failed to fetch next steps', nextStepsError, { ...context, useCaseId })
      return NextResponse.json({ error: 'Error fetching next steps' }, { status: 500 })
    }

    return NextResponse.json(nextSteps)

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Next steps API error', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
