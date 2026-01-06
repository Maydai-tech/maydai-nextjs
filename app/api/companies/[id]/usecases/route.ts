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
    const { id } = await params

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

    // Check access via user_companies (owner or user) + user_profiles hierarchy
    // 1. Check direct access via user_companies
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    let hasAccess = !!userCompany

    // 2. If no direct access, check profile-level access
    if (!hasAccess) {
      // Get the owner of this company
      const { data: ownerRecord } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', id)
        .eq('role', 'owner')
        .maybeSingle()

      if (ownerRecord) {
        const { data: profileAccess } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('inviter_user_id', ownerRecord.user_id)
          .eq('invited_user_id', user.id)
          .maybeSingle()

        hasAccess = !!profileAccess
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Fetch use cases for this company with model information and scores
    const { data: usecases, error: usecasesError } = await supabase
      .from('usecases')
      .select(`
        *,
        companies(name)
      `)
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    // Fetch model information separately if usecases have primary_model_id
    if (usecases && usecases.length > 0) {
      const modelIds = usecases
        .map(uc => uc.primary_model_id)
        .filter((id): id is string => id !== null && id !== undefined)

      if (modelIds.length > 0) {
        const { data: models } = await supabase
          .from('compl_ai_models')
          .select('id, model_name, model_provider, model_type, version')
          .in('id', modelIds)

        if (models) {
          const modelsMap = new Map(models.map(m => [m.id, m]))
          usecases.forEach(uc => {
            if (uc.primary_model_id && modelsMap.has(uc.primary_model_id)) {
              uc.compl_ai_models = modelsMap.get(uc.primary_model_id)
            }
          })
        }
      }
    }

    if (usecasesError) {
      console.error('Error fetching use cases:', usecasesError)
      return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
    }

    // Récupérer les profils séparément si des usecases ont un updated_by
    if (usecases && usecases.length > 0) {
      const updatedByIds = usecases
        .map(uc => uc.updated_by)
        .filter((id): id is string => id !== null && id !== undefined)
      
      if (updatedByIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', updatedByIds)
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError)
        } else {
          const profilesMap = new Map(
            (profiles || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
          )
          
          // Enrichir les usecases avec les profils
          usecases.forEach(uc => {
            if (uc.updated_by && profilesMap.has(uc.updated_by)) {
              uc.updated_by_profile = profilesMap.get(uc.updated_by)!
            }
          })
        }
      }
    }

    return NextResponse.json(usecases || [])

  } catch (error) {
    console.error('Error in company usecases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 