import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

export async function GET(request: NextRequest) {
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

    // Get user's profile to find company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 })
    }

    // If user has a company_id, fetch use cases for that company
    if (profile.company_id) {
      const { data: usecases, error: usecasesError } = await supabase
        .from('usecases')
        .select(`
          *,
          companies(name)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (usecasesError) {
        return NextResponse.json({ error: 'Error fetching use cases' }, { status: 500 })
      }

      return NextResponse.json(usecases || [])
    }

    // Return empty array if no company associated
    return NextResponse.json([])

  } catch (error) {
    console.error('Error in usecases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 