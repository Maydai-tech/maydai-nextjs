import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  ANALYTICS_TIMEZONE,
  bucketKeyForInstant,
  enumerateBucketKeys,
  formatBucketLabel,
  parisDateRangeToUtcBounds,
  type AnalyticsGranularity,
} from '@/lib/admin-analytics-buckets'

const PAGE_SIZE = 1000

type SubStatusFilter = 'all' | 'active' | 'trialing' | 'inactive'

function parseYmd(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

interface PlanRow {
  id: string
  plan_id: string
  display_name: string
  price_monthly: number | null
  price_yearly: number | null
}

function buildPlanMaps(plans: PlanRow[]) {
  const uuidToPlanId = new Map<string, string>()
  const planIdToDisplay = new Map<string, string>()
  for (const p of plans) {
    uuidToPlanId.set(p.id, p.plan_id)
    planIdToDisplay.set(p.plan_id, p.display_name)
  }
  return { uuidToPlanId, planIdToDisplay }
}

function resolveEffectivePlanId(
  latestSub: { plan_id: string; status: string } | undefined,
  uuidToPlanId: Map<string, string>
): { effectiveKey: string; isFreemium: boolean } {
  if (!latestSub) {
    return { effectiveKey: 'freemium', isFreemium: true }
  }
  const active =
    latestSub.status === 'active' || latestSub.status === 'trialing'
  if (!active) {
    return { effectiveKey: 'freemium', isFreemium: true }
  }
  const raw = latestSub.plan_id
  const textual = isUuid(raw) ? uuidToPlanId.get(raw) ?? raw : raw
  return { effectiveKey: textual, isFreemium: false }
}

function matchesSubStatus(
  latestSub: { status: string } | undefined,
  filter: SubStatusFilter
): boolean {
  if (filter === 'all') return true
  const st = latestSub?.status
  if (filter === 'active') return st === 'active'
  if (filter === 'trialing') return st === 'trialing'
  if (filter === 'inactive') {
    return !st || (st !== 'active' && st !== 'trialing')
  }
  return true
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  apply: (q: any) => any
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  for (;;) {
    let q = supabase.from(table).select(select)
    q = apply(q)
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data || []) as T[]
    out.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return out
}

function mergeLatestSubscription(
  existing:
    | { plan_id: string; status: string; created_at: string }
    | undefined,
  row: { plan_id: string; status: string; created_at: string }
) {
  if (!existing) return row
  return new Date(row.created_at) > new Date(existing.created_at)
    ? row
    : existing
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  const sp = request.nextUrl.searchParams
  const fromYmd = parseYmd(sp.get('from'))
  const toYmd = parseYmd(sp.get('to'))
  const granularity = (sp.get('granularity') || 'week') as AnalyticsGranularity
  const roleFilter = sp.get('role') || 'all'
  const planFilter = sp.get('plan') || 'all'
  const subStatusFilter = (sp.get('subscription_status') ||
    'all') as SubStatusFilter
  const usecaseStatusFilter = sp.get('usecase_status') || 'all'

  if (!fromYmd || !toYmd) {
    return NextResponse.json(
      { error: 'Paramètres from et to requis (format YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const validGran: AnalyticsGranularity[] = ['day', 'week', 'month', 'quarter']
  if (!validGran.includes(granularity)) {
    return NextResponse.json({ error: 'granularity invalide' }, { status: 400 })
  }

  const { startUtc, endUtc } = parisDateRangeToUtcBounds(fromYmd, toYmd)
  if (startUtc > endUtc) {
    return NextResponse.json(
      { error: 'La date de début doit être avant la date de fin' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: planRows, error: plansError } = await supabase
    .from('plans')
    .select('id, plan_id, display_name, price_monthly, price_yearly')
    .order('display_order', { ascending: true })

  if (plansError) {
    console.error('analytics plans error', plansError)
    return NextResponse.json(
      { error: 'Impossible de charger les plans' },
      { status: 500 }
    )
  }

  const { uuidToPlanId } = buildPlanMaps((planRows || []) as PlanRow[])

  try {
    const profiles = await fetchAllRows<{
      id: string
      created_at: string
      role: string
    }>(supabase, 'profiles', 'id, created_at, role', (q) =>
      q
        .gte('created_at', startUtc.toISOString())
        .lte('created_at', endUtc.toISOString())
        .order('created_at', { ascending: true })
    )

    let filteredProfiles = profiles
    if (roleFilter !== 'all') {
      filteredProfiles = filteredProfiles.filter((p) => p.role === roleFilter)
    }

    const profileIds = filteredProfiles.map((p) => p.id)
    const latestSubByUser = new Map<
      string,
      { plan_id: string; status: string; created_at: string }
    >()

    if (profileIds.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < profileIds.length; i += chunkSize) {
        const chunk = profileIds.slice(i, i + chunkSize)
        const { data: subs, error: subErr } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id, status, created_at')
          .in('user_id', chunk)

        if (subErr) throw subErr
        for (const row of subs || []) {
          const uid = row.user_id as string
          const cur = {
            plan_id: row.plan_id as string,
            status: row.status as string,
            created_at: row.created_at as string,
          }
          latestSubByUser.set(
            uid,
            mergeLatestSubscription(latestSubByUser.get(uid), cur)
          )
        }
      }
    }

    const afterPlanAndSub: typeof filteredProfiles = []
    for (const p of filteredProfiles) {
      const subFull = latestSubByUser.get(p.id)
      const sub = subFull
        ? { plan_id: subFull.plan_id, status: subFull.status }
        : undefined
      if (!matchesSubStatus(sub, subStatusFilter)) continue

      const { effectiveKey, isFreemium } = resolveEffectivePlanId(
        sub,
        uuidToPlanId
      )
      if (planFilter !== 'all') {
        if (planFilter === 'freemium') {
          if (!isFreemium) continue
        } else if (effectiveKey !== planFilter) {
          continue
        }
      }
      afterPlanAndSub.push(p)
    }

    const bucketKeys = enumerateBucketKeys(fromYmd, toYmd, granularity)
    const profileCounts = new Map<string, number>()
    for (const k of bucketKeys) profileCounts.set(k, 0)

    for (const p of afterPlanAndSub) {
      const k = bucketKeyForInstant(new Date(p.created_at), granularity)
      profileCounts.set(k, (profileCounts.get(k) || 0) + 1)
    }

    let cumul = 0
    const profileSeries = bucketKeys.map((key) => {
      const count = profileCounts.get(key) || 0
      cumul += count
      return {
        key,
        label: formatBucketLabel(key, granularity),
        count,
        cumulative: cumul,
      }
    })

    const usecases = await fetchAllRows<{
      id: string
      created_at: string
      company_id: string
      status: string
    }>(supabase, 'usecases', 'id, created_at, company_id, status', (q) =>
      q
        .gte('created_at', startUtc.toISOString())
        .lte('created_at', endUtc.toISOString())
        .order('created_at', { ascending: true })
    )

    let filteredUsecases = usecases
    if (usecaseStatusFilter !== 'all') {
      filteredUsecases = filteredUsecases.filter(
        (u) => u.status === usecaseStatusFilter
      )
    }

    const companyIds = [
      ...new Set(filteredUsecases.map((u) => u.company_id).filter(Boolean)),
    ] as string[]

    const ownerByCompany = new Map<string, string>()
    if (companyIds.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < companyIds.length; i += chunkSize) {
        const chunk = companyIds.slice(i, i + chunkSize)
        const { data: ucRows, error: ucErr } = await supabase
          .from('user_companies')
          .select('company_id, user_id, role')
          .in('company_id', chunk)
          .in('role', ['owner', 'company_owner'])

        if (ucErr) throw ucErr
        for (const row of ucRows || []) {
          const cid = row.company_id as string
          if (!ownerByCompany.has(cid)) {
            ownerByCompany.set(cid, row.user_id as string)
          }
        }
      }
    }

    const ownerIds = [...new Set(ownerByCompany.values())]
    const ownerSubByUser = new Map<
      string,
      { plan_id: string; status: string; created_at: string }
    >()
    if (ownerIds.length > 0) {
      const chunkSize = 200
      for (let i = 0; i < ownerIds.length; i += chunkSize) {
        const chunk = ownerIds.slice(i, i + chunkSize)
        const { data: subs, error: subErr } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id, status, created_at')
          .in('user_id', chunk)

        if (subErr) throw subErr
        for (const row of subs || []) {
          const uid = row.user_id as string
          const cur = {
            plan_id: row.plan_id as string,
            status: row.status as string,
            created_at: row.created_at as string,
          }
          ownerSubByUser.set(
            uid,
            mergeLatestSubscription(ownerSubByUser.get(uid), cur)
          )
        }
      }
    }

    const usecasesAfterFilters: typeof filteredUsecases = []
    for (const u of filteredUsecases) {
      const ownerId = ownerByCompany.get(u.company_id)
      const subFull = ownerId ? ownerSubByUser.get(ownerId) : undefined
      const sub = subFull
        ? { plan_id: subFull.plan_id, status: subFull.status }
        : undefined
      if (!matchesSubStatus(sub, subStatusFilter)) continue

      const { effectiveKey, isFreemium } = resolveEffectivePlanId(
        sub,
        uuidToPlanId
      )
      if (planFilter !== 'all') {
        if (planFilter === 'freemium') {
          if (!isFreemium) continue
        } else if (effectiveKey !== planFilter) {
          continue
        }
      }
      usecasesAfterFilters.push(u)
    }

    const usecaseCounts = new Map<string, number>()
    for (const k of bucketKeys) usecaseCounts.set(k, 0)

    for (const u of usecasesAfterFilters) {
      const k = bucketKeyForInstant(new Date(u.created_at), granularity)
      usecaseCounts.set(k, (usecaseCounts.get(k) || 0) + 1)
    }

    let ucCumul = 0
    const usecaseSeries = bucketKeys.map((key) => {
      const count = usecaseCounts.get(key) || 0
      ucCumul += count
      return {
        key,
        label: formatBucketLabel(key, granularity),
        count,
        cumulative: ucCumul,
      }
    })

    return NextResponse.json({
      meta: {
        from: fromYmd,
        to: toYmd,
        granularity,
        timezone: ANALYTICS_TIMEZONE,
        totalProfilesRaw: profiles.length,
        totalProfilesFiltered: afterPlanAndSub.length,
        totalUsecasesRaw: usecases.length,
        totalUsecasesFiltered: usecasesAfterFilters.length,
      },
      accounts: {
        description:
          'Comptes = profils créés sur la période (created_at), filtres plan / abonnement = état actuel.',
        totalInPeriod: afterPlanAndSub.length,
        series: profileSeries,
      },
      users: {
        description:
          'Identique aux comptes : nombre de profils créés sur la période (même agrégation).',
        totalInPeriod: afterPlanAndSub.length,
        series: profileSeries,
      },
      usecases: {
        totalInPeriod: usecasesAfterFilters.length,
        series: usecaseSeries,
      },
    })
  } catch (e) {
    console.error('admin analytics error', e)
    return NextResponse.json(
      {
        error: 'Erreur lors du calcul des statistiques',
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}
