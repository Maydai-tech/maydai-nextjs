import { createClient } from '@supabase/supabase-js'
import { hasAccessToResource, isOwner as isResourceOwner, getUserHighestRole, type CollaboratorRole } from './collaborators'

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
 * @deprecated Use getUserHighestRole from collaborators.ts instead
 */
export async function getUserRoleForCompany(
  userId: string,
  companyId: string,
  token: string
): Promise<CollaboratorRole | null> {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  // Check user_companies table for role
  const { data, error } = await supabase
    .from('user_companies')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as CollaboratorRole
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

  // Get companies where user has owner role via user_companies
  const { data: collaboratorCompanies } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (!collaboratorCompanies) {
    return []
  }

  return collaboratorCompanies.map(uc => uc.company_id)
}
