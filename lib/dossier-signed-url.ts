import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { extractDossierStoragePath } from '@/lib/dossier-storage-path'

export const DOSSIERS_BUCKET = 'dossiers'
export const DOSSIER_SIGNED_URL_TTL_SECONDS = 300

function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function userCanAccessDossierPath(
  supabase: SupabaseClient,
  userId: string,
  storagePath: string
): Promise<boolean> {
  const companyId = storagePath.split('/')[0]
  if (!companyId) return false

  const { data, error } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return false
  return true
}

export async function createDossierSignedUrl(storagePath: string): Promise<string | null> {
  const path = extractDossierStoragePath(storagePath)
  if (!path) return null

  const supabase = getServiceRoleClient()
  if (!supabase) return null

  const { data, error } = await supabase.storage
    .from(DOSSIERS_BUCKET)
    .createSignedUrl(path, DOSSIER_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
