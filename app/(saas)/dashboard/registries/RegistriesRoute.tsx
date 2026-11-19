import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessibleCompanies } from '@/lib/services/companyAccessService'
import { getProfileCompletenessScoreFromDb } from '@/lib/services/profileScoreService'
import {
  DashboardMetricsSchema,
  type DashboardMetrics,
} from '@/lib/validations/dashboard-metrics'
import { listProcurements, listReceivedProcurements } from '@/lib/services/procurementService'
import type { Procurement, ReceivedProcurement } from '@/lib/validations/procurement'
import RegistriesPage, { type Company } from './RegistriesPage'

const DEFAULT_METRICS: DashboardMetrics = {
  profileCompleteness: 0,
  activeRegistries: 0,
  evaluatedUsecases: 0,
  invitedCollaborators: 0,
}

async function loadDashboardData(
  userId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<{ metrics: DashboardMetrics; initialCompanies: Company[] }> {
  let metrics: DashboardMetrics = { ...DEFAULT_METRICS }
  let initialCompanies: Company[] = []

  try {
    const [profileCompletenessResult, accessResult, collaboratorsResult] = await Promise.all([
      getProfileCompletenessScoreFromDb(userId).catch((error) => {
        console.error('[Dashboard SSR] completeness_score (service-role):', error)
        return 0
      }),
      getUserAccessibleCompanies(userId, supabase).catch((error) => {
        console.error('[Dashboard SSR]', error)
        return { companyIdsArray: [] as string[], roleMap: new Map<string, string>() }
      }),
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('inviter_user_id', userId),
    ])

    if (collaboratorsResult.error) {
      console.error('[Dashboard SSR]', collaboratorsResult.error)
    }

    const profileCompleteness = profileCompletenessResult

    const { companyIdsArray, roleMap } = accessResult
    const activeRegistries = companyIdsArray.length
    const invitedCollaborators = collaboratorsResult.error
      ? 0
      : collaboratorsResult.count ?? 0

    let evaluatedUsecases = 0

    if (companyIdsArray.length > 0) {
      const [statsResult, companiesResult] = await Promise.all([
        supabase
          .from('company_stats')
          .select('usecase_count')
          .in('company_id', companyIdsArray),
        supabase.from('companies').select('*').in('id', companyIdsArray).neq('lifecycle_status', 'soft_deleted'),
      ])

      if (statsResult.error) {
        console.error('[Dashboard SSR]', statsResult.error)
      } else {
        evaluatedUsecases =
          statsResult.data?.reduce(
            (sum, row) => sum + Number(row.usecase_count ?? 0),
            0
          ) ?? 0
      }

      if (companiesResult.error) {
        console.error('[Dashboard SSR]', companiesResult.error)
      } else {
        initialCompanies =
          companiesResult.data?.map((company) => ({
            id: company.id,
            name: company.name,
            role: roleMap.get(company.id) ?? 'user',
          })) ?? []
      }
    }

    const parsed = DashboardMetricsSchema.safeParse({
      profileCompleteness,
      activeRegistries,
      evaluatedUsecases,
      invitedCollaborators,
    })

    if (parsed.success) {
      metrics = parsed.data
    } else {
      console.error('[Dashboard SSR]', parsed.error)
      metrics = { ...DEFAULT_METRICS }
    }
  } catch (error) {
    console.error('[Dashboard SSR]', error)
    metrics = { ...DEFAULT_METRICS }
    initialCompanies = []
  }

  return { metrics, initialCompanies }
}

export default async function RegistriesRoute() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const [{ metrics, initialCompanies }, procurements, received] = await Promise.all([
    loadDashboardData(user.id, supabase),
    listProcurements(supabase, user.id).then((data) => ({ data, error: null as string | null })).catch((error) => {
      console.error('[Procurements] Liste indisponible:', error)
      return { data: [] as Procurement[], error: 'Impossible de charger vos appels d’offres. Veuillez réessayer.' }
    }),
    listReceivedProcurements(supabase).then((data) => ({ data, error: null as string | null })).catch((error) => {
      console.error('[Procurements] Appels reçus indisponibles:', error)
      return { data: [] as ReceivedProcurement[], error: 'Impossible de charger les appels d’offres reçus. Rechargez la page.' }
    }),
  ])

  return (
    <RegistriesPage
      initialMetrics={metrics}
      initialCompanies={initialCompanies}
      initialProcurements={procurements.data}
      procurementsError={procurements.error}
      initialReceived={received.data}
      receivedError={received.error}
    />
  )
}
