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

/**
 * GET /api/plans
 * Public endpoint - Plans are public pricing information, no auth required.
 * RLS policy on plans table is USING (true) for SELECT.
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with anon key (public access)
    // Plans are public data - RLS allows SELECT for everyone
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

    // Fetch all plans ordered by display_order
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('display_order', { ascending: true })

    if (plansError) {
      console.error('Error fetching plans:', plansError)
      return NextResponse.json({ error: 'Error fetching plans' }, { status: 500 })
    }

    return NextResponse.json(plans || [])

  } catch (error) {
    const context = createRequestContext(request)
    logger.error('Failed to fetch plans', error, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
