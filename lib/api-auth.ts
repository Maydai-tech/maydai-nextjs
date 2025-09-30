import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function getAuthenticatedSupabaseClient(request: NextRequest) {
  // Déplacer la vérification des variables d'environnement ici
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
    )
  }
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create Supabase client with the user's token
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
  
  // Verify the token and get user
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
  if (authError || !user) {
    throw new Error('Invalid token')
  }

  return { supabase: supabaseClient, user }
}

export async function getUserCompanyId(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Error fetching profile')
  }

  return profile.company_id
} 