'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FunnelFilter } from './FunnelFilter'
import { FunnelKPIs } from './FunnelKPIs'
import { LeadsTableEmptyState } from './LeadsTableEmptyState'
import { LeadFunnelProgress } from './LeadFunnelProgress'
import { parseFunnelStage, parseLeadRevenue, type LeadRow } from './types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NativeSelect } from '@/components/ui/select'
import { Filter } from 'lucide-react'

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

function na(v: string | null | undefined): string {
  const t = v?.trim()
  return t && t.length > 0 ? t : 'N/A'
}

function campaignKey(lead: LeadRow): string {
  const u = lead.utm_campaign?.trim()
  const c = lead.campaign_name?.trim()
  const v = u || c || ''
  return v || '__none__'
}

function prospectDisplay(lead: LeadRow): string {
  const fn = lead.first_name?.trim()
  const ln = lead.last_name?.trim()
  if (fn && ln) return `${fn} ${ln}`
  if (fn) return fn
  if (ln) return ln
  return na(lead.email)
}

function sourceLabel(source: string | null): string {
  const s = (source ?? '').trim() || 'N/A'
  const map: Record<string, string> = {
    google_ads_form: 'Google Ads',
    website_direct: 'Site web',
    facebook_ads: 'Facebook',
    linkedin_ads: 'LinkedIn',
    'Google Ads': 'Google Ads (legacy)',
  }
  return map[s] ?? s
}

function sourceBadgeVariant(source: string | null): BadgeVariant {
  const s = (source ?? '').trim()
  if (s === 'google_ads_form' || s === 'Google Ads') return 'default'
  if (s === 'website_direct') return 'secondary'
  if (s === 'facebook_ads') return 'warning'
  if (s === 'linkedin_ads') return 'outline'
  return 'outline'
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type PeriodFilter = 'all' | '7d' | '30d'

type Props = {
  initialLeads: LeadRow[]
  serverError: string | null
  newLeadsCount: number
  inProgressCount: number
  convertedCount: number
  totalLtv: number
}

export default function MarketingDashboard({
  initialLeads,
  serverError,
  newLeadsCount,
  inProgressCount,
  convertedCount,
  totalLtv,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [campaignFilter, setCampaignFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')

  const hasActiveFilters =
    Boolean(searchParams.get('stage')) ||
    sourceFilter !== 'all' ||
    campaignFilter !== 'all' ||
    periodFilter !== 'all'

  const handleResetAll = useCallback(() => {
    setSourceFilter('all')
    setCampaignFilter('all')
    setPeriodFilter('all')
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const sourceOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of initialLeads) {
      set.add((l.source ?? '').trim() || '__none__')
    }
    return [...set].sort()
  }, [initialLeads])

  const campaignOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of initialLeads) {
      set.add(campaignKey(l))
    }
    return [...set].sort((a, b) => {
      if (a === '__none__') return 1
      if (b === '__none__') return -1
      return a.localeCompare(b, 'fr')
    })
  }, [initialLeads])

  const filteredLeads = useMemo(() => {
    const now = Date.now()
    const ms7 = 7 * 24 * 60 * 60 * 1000
    const ms30 = 30 * 24 * 60 * 60 * 1000

    return initialLeads.filter((lead) => {
      if (sourceFilter !== 'all') {
        const s = (lead.source ?? '').trim() || '__none__'
        if (s !== sourceFilter) return false
      }
      if (campaignFilter !== 'all') {
        if (campaignKey(lead) !== campaignFilter) return false
      }
      if (periodFilter !== 'all') {
        const t = new Date(lead.created_at).getTime()
        if (Number.isNaN(t)) return false
        const delta = now - t
        if (periodFilter === '7d' && delta > ms7) return false
        if (periodFilter === '30d' && delta > ms30) return false
      }
      return true
    })
  }, [initialLeads, sourceFilter, campaignFilter, periodFilter])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing & LTV</h1>
        <p className="mt-2 text-gray-600">
          Pilotage omnicanal des leads et de la valeur générée (lecture seule).
        </p>
      </div>

      {serverError ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <strong className="font-medium">Données partielles ou indisponibles.</strong>{' '}
          {serverError}
        </div>
      ) : null}

      <FunnelKPIs
        newLeadsCount={newLeadsCount}
        inProgressCount={inProgressCount}
        convertedCount={convertedCount}
        totalLtv={totalLtv}
      />

      {/* Filtres */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 pb-4">
          <Filter className="h-5 w-5 text-gray-500" aria-hidden />
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <FunnelFilter />

          <NativeSelect
            label="Source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2"
          >
            <option value="all">Toutes les sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s === '__none__' ? 'N/A' : sourceLabel(s === '__none__' ? null : s)}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            label="Campagne"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2"
          >
            <option value="all">Toutes les campagnes</option>
            {campaignOptions.map((k) => (
              <option key={k} value={k}>
                {k === '__none__' ? 'N/A' : k}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            label="Période"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2"
          >
            <option value="all">Toutes</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
          </NativeSelect>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            {filteredLeads.length} ligne(s) — données en lecture seule.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] rounded-md"
            tabIndex={0}
            aria-label="Tableau des leads"
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date d&apos;acquisition</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Canal &amp; source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Valeur LTV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <LeadsTableEmptyState
                      hasActiveFilters={hasActiveFilters}
                      onReset={handleResetAll}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const funnelStage = parseFunnelStage(lead.funnel_stage)
                  const utmBits = [
                    `utm_source: ${na(lead.utm_source)}`,
                    `utm_medium: ${na(lead.utm_medium)}`,
                    `utm_campaign: ${na(lead.utm_campaign)}`,
                  ]
                  const click = na(lead.click_id ?? lead.gclid)
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatCreatedAt(lead.created_at)}
                      </TableCell>
                      <TableCell>{prospectDisplay(lead)}</TableCell>
                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col gap-1">
                          <Badge variant={sourceBadgeVariant(lead.source)}>
                            {sourceLabel(lead.source)}
                          </Badge>
                          <span className="text-xs text-gray-500 leading-snug">
                            {utmBits.join(' · ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            click_id: {click}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LeadFunnelProgress stage={funnelStage} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {eur.format(parseLeadRevenue(lead.total_revenue))}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
