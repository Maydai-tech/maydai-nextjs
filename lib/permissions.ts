import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définies'
  )
}

/**
 * Get user role for a specific company
 * @returns 'owner', 'user', or null if no access
 */
export async function getUserRoleForCompany(
  userId: string,
  companyId: string,
  token: string
): Promise<'owner' | 'user' | null> {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data, error } = await supabase
    .from('user_companies')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  // Normalize role: 'company_owner' is treated as 'owner'
  if (data.role === 'owner' || data.role === 'company_owner') {
    return 'owner'
  }

  return data.role as 'owner' | 'user'
}

/**
 * Check if user is owner of a company
 */
export async function isOwnerOfCompany(
  userId: string,
  companyId: string,
  token: string
): Promise<boolean> {
  const role = await getUserRoleForCompany(userId, companyId, token)
  return role === 'owner'
}

/**
 * Check if user has access to a company (owner or collaborator)
 */
export async function hasAccessToCompany(
  userId: string,
  companyId: string,
  token: string
): Promise<boolean> {
  const role = await getUserRoleForCompany(userId, companyId, token)
  return role !== null
}

/**
 * Get all companies where user is owner
 */
export async function getUserOwnedCompanies(
  userId: string,
  token: string
): Promise<string[]> {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .in('role', ['owner', 'company_owner'])
    .eq('is_active', true)

  if (error || !data) {
    return []
  }

  return data.map(uc => uc.company_id)
}
