import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserPlan } from '@/lib/subscription/user-plan'
import { logger, createRequestContext } from '@/lib/secure-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent etre definies'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
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

    // Await params in Next.js 15+
    const { profileId } = await params

    // Verify user can access the requested profile
    // For now, only allow access to own profile
    if (user.id !== profileId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez acceder qu\'a votre propre profil' },
        { status: 403 }
      )
    }

    // Get current user plan
    const userPlan = await getCurrentUserPlan(profileId)

    return NextResponse.json({
      subscription: userPlan.subscription,
      plan: userPlan.planInfo,
      hasActiveSubscription: userPlan.hasActiveSubscription
    })

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch user plan', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
