import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRegistryOwnerPlan } from '@/lib/subscription/user-plan'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

/**
 * GET /api/companies/[id]/owner-plan
 * Récupère le plan du propriétaire d'un registre
 * Utilisé pour vérifier les limites (use cases, collaborateurs) basées sur le plan du propriétaire
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params

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

    // Check user has access to this company (owner or collaborator)
    const { data: userCompany } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!userCompany) {
      return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 })
    }

    // Get the owner's plan
    const ownerPlan = await getRegistryOwnerPlan(companyId, supabase)

    return NextResponse.json({
      subscription: ownerPlan.subscription,
      plan: ownerPlan.planInfo,
      hasActiveSubscription: ownerPlan.hasActiveSubscription
    })

  } catch (error) {
    console.error('Error in owner-plan API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
