import type { SupabaseClient, User } from '@supabase/supabase-js'
import { logger } from '@/lib/secure-logger'
import type {
  CompanyProfileFields,
  CompanyProfileSources,
  CompanyProfileUpdate,
} from '@/lib/mistral/company-profile-tool'
import { mergeCompanyProfile, mergeRegisterWithAccountFallback } from '@/lib/mistral/company-profile-tool'

type AccessResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string }

export type LoadCompanyProfileResult =
  | { ok: true; profile: CompanyProfileFields; sources: CompanyProfileSources }
  | { ok: false; status: number; error: string; code?: string }

export type PersistCompanyProfileResult =
  | { ok: true; profile: CompanyProfileFields }
  | { ok: false; status: number; error: string; code?: string }

async function assertCompanyAccess(
  supabase: SupabaseClient,
  user: User,
  companyId: string
): Promise<AccessResult> {
  const { data: userCompany, error: accessError } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (accessError) {
    logger.error('persist-company-profile: accès user_companies', undefined, {
      details: accessError.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Erreur lors de la vérification des droits',
      code: 'DB_ERROR',
    }
  }

  if (!userCompany) {
    return {
      ok: false,
      status: 403,
      error: 'Registre introuvable ou accès refusé',
      code: 'ACCESS_DENIED',
    }
  }

  return { ok: true }
}

function asNullableString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export async function loadCompanyProfile(
  supabase: SupabaseClient,
  user: User,
  companyId: string
): Promise<LoadCompanyProfileResult> {
  const access = await assertCompanyAccess(supabase, user, companyId)
  if (!access.ok) return access

  const { data, error } = await supabase
    .from('companies')
    .select('name, industry, sub_category_id, country, street_address, postal_code, city')
    .eq('id', companyId)
    .maybeSingle()

  if (error) {
    logger.error('loadCompanyProfile: lecture companies', undefined, {
      details: error.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Impossible de charger le profil entreprise',
      code: 'DB_ERROR',
    }
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      error: 'Registre introuvable',
      code: 'NOT_FOUND',
    }
  }

  const registerProfile: CompanyProfileFields = {
    name: asNullableString(data.name),
    industry: asNullableString(data.industry),
    sub_category_id: asNullableString(data.sub_category_id),
    country: asNullableString(data.country),
    street_address: asNullableString(data.street_address),
    postal_code: asNullableString(data.postal_code),
    city: asNullableString(data.city),
  }

  const { data: account, error: accountError } = await supabase
    .from('profiles')
    .select('company_name, industry, sub_category_id')
    .eq('id', user.id)
    .maybeSingle()

  if (accountError) {
    logger.error('loadCompanyProfile: lecture profiles (repli non bloquant)', undefined, {
      details: accountError.message,
    })
  }

  const merged = mergeRegisterWithAccountFallback(registerProfile, {
    company_name: asNullableString(account?.company_name),
    industry: asNullableString(account?.industry),
    sub_category_id: asNullableString(account?.sub_category_id),
  })

  return {
    ok: true,
    profile: merged.profile,
    sources: merged.sources,
  }
}

export async function persistCompanyProfile(
  supabase: SupabaseClient,
  user: User,
  companyId: string,
  update: CompanyProfileUpdate
): Promise<PersistCompanyProfileResult> {
  const loaded = await loadCompanyProfile(supabase, user, companyId)
  if (!loaded.ok) return loaded

  const registerName = loaded.sources.name === 'register' ? loaded.profile.name : null
  const profile = mergeCompanyProfile(loaded.profile, update)

  const patch: Record<string, unknown> = {
    industry: profile.industry,
    sub_category_id: profile.sub_category_id,
    country: profile.country,
    street_address: profile.street_address,
    postal_code: profile.postal_code,
    city: profile.city,
    updated_at: new Date().toISOString(),
  }

  if (!registerName && profile.name) {
    patch.name = profile.name
  }

  const { error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', companyId)

  if (error) {
    logger.error('persistCompanyProfile: update companies', undefined, {
      details: error.message,
    })
    return {
      ok: false,
      status: 500,
      error: 'Impossible d’enregistrer le profil entreprise',
      code: 'DB_ERROR',
    }
  }

  return { ok: true, profile }
}
