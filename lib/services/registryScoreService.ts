import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { calculateRegistryCompletenessScore } from '@/lib/validations/registry-completeness'

export type SyncProfileSirenResult = {
  updatedCount: number
  companyIds: string[]
}

function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e) pour la cascade SIREN'
    )
  }
  return createClient(url, key)
}

/**
 * Propage le SIREN profil vers tous les registres dont l'utilisateur est propriétaire,
 * puis recalcule completeness_score pour chaque registre touché.
 */
export async function syncProfileSirenToRegistries(
  userId: string,
  siren: string
): Promise<SyncProfileSirenResult> {
  const supabase = getServiceRoleClient()
  const normalizedSiren = siren.trim()

  const { data: ownerLinks, error: linksError } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (linksError) {
    throw new Error(`Échec lecture user_companies (owner) pour ${userId}: ${linksError.message}`)
  }

  if (!Array.isArray(ownerLinks)) {
    throw new Error(
      `Réponse PostgREST inattendue pour user_companies: attendu un tableau, reçu ${typeof ownerLinks}`
    )
  }

  if (ownerLinks.length === 0) {
    return { updatedCount: 0, companyIds: [] }
  }

  const companyIds = [
    ...new Set(
      ownerLinks.map((link, index) => {
        if (!link || typeof link.company_id !== 'string' || !link.company_id.trim()) {
          throw new Error(
            `Ligne user_companies invalide à l'index ${index}: company_id manquant pour userId=${userId}`
          )
        }
        return link.company_id
      })
    ),
  ]

  let updatedCount = 0

  for (const companyId of companyIds) {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(
        'name, city, country, type, industry, sub_category_id, is_centralized_registry, maydai_as_registry'
      )
      .eq('id', companyId)
      .single()

    if (companyError) {
      throw new Error(
        `Échec lecture registre ${companyId} pour userId=${userId}: ${companyError.message}`
      )
    }

    const { count: memberCount, error: countError } = await supabase
      .from('user_companies')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (countError) {
      throw new Error(
        `Échec comptage collaborateurs registre ${companyId}: ${countError.message}`
      )
    }

    const isCentralized =
      company.is_centralized_registry === true || company.maydai_as_registry === true

    const completeness_score = calculateRegistryCompletenessScore({
      name: company.name,
      industry: company.industry,
      sub_category_id: company.sub_category_id,
      city: company.city,
      country: company.country,
      type: company.type,
      siren: normalizedSiren,
      profileSirenFallback: normalizedSiren,
      has_collaborators: (memberCount ?? 0) > 1,
      is_centralized_registry: isCentralized,
    })

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        siren: normalizedSiren || null,
        completeness_score,
      })
      .eq('id', companyId)

    if (updateError) {
      throw new Error(
        `Échec mise à jour registre ${companyId} (siren/score): ${updateError.message}`
      )
    }

    updatedCount++
  }

  return { updatedCount, companyIds }
}
