import type { SupabaseClient } from '@supabase/supabase-js'
import { isEntityOccupyingFreemiumSlot } from '@/lib/validations/governance-scores'

interface LifecycleRow {
  lifecycle_status?: string | null
  purge_available_at?: string | null
}

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

function occupyingCount(rows: LifecycleRow[] | null): number {
  return (rows ?? []).filter((row) => isEntityOccupyingFreemiumSlot(row)).length
}

export async function countActiveOwnedRegistries(
  userId: string,
  supabaseService: SupabaseClient
): Promise<number> {
  const { data: links, error: linkError } = await supabaseService
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (linkError) throw dbError(linkError, '[quota] registres owner')

  const companyIds = [
    ...new Set(
      (links ?? [])
        .map((row) => row.company_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]
  if (companyIds.length === 0) return 0

  const { data, error } = await supabaseService
    .from('companies')
    .select('id, lifecycle_status, purge_available_at')
    .in('id', companyIds)

  if (error) throw dbError(error, '[quota] lecture companies')
  return occupyingCount(data)
}

export async function countActiveUseCasesForRegistry(
  companyId: string,
  supabaseService: SupabaseClient
): Promise<number> {
  const result = await supabaseService
    .from('usecases')
    .select('id, lifecycle_status, purge_available_at')
    .eq('company_id', companyId)

  const { data, error, count } = result as {
    data: LifecycleRow[] | null
    error: { message?: string; details?: string } | null
    count?: number | null
  }

  if (error) throw dbError(error, '[quota] lecture usecases')
  if (Array.isArray(data)) return occupyingCount(data)
  if (typeof count === 'number') return count
  return 0
}

export async function listAccountCollaboratorIds(
  ownerUserId: string,
  supabaseService: SupabaseClient
): Promise<Set<string>> {
  const ids = new Set<string>()

  const { data: invited, error: invitedError } = await supabaseService
    .from('user_profiles')
    .select('invited_user_id')
    .eq('inviter_user_id', ownerUserId)

  if (invitedError) throw dbError(invitedError, '[quota] user_profiles')

  for (const row of invited ?? []) {
    if (row.invited_user_id && row.invited_user_id !== ownerUserId) {
      ids.add(row.invited_user_id)
    }
  }

  const { data: added, error: addedError } = await supabaseService
    .from('user_companies')
    .select('user_id')
    .eq('added_by', ownerUserId)
    .neq('role', 'owner')

  if (addedError) throw dbError(addedError, '[quota] user_companies')

  for (const row of added ?? []) {
    if (row.user_id && row.user_id !== ownerUserId) ids.add(row.user_id)
  }

  return ids
}

export async function countAccountCollaborators(
  ownerUserId: string,
  supabaseService: SupabaseClient
): Promise<number> {
  const ids = await listAccountCollaboratorIds(ownerUserId, supabaseService)
  return ids.size
}
