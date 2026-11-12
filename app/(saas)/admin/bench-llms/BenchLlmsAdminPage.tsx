'use client'

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronRight,
  Database,
  Download,
  Leaf,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import Toast from '@/components/Toast'
import { useAuth } from '@/lib/auth'
import type {
  BenchFilterableSourceKey,
  BenchLifecycleFilter,
  BenchProviderGroup,
  BenchSortColumn,
  BenchSortDirection,
  BenchSourceCoverageMap,
  UnifiedBenchModel,
} from '@/lib/bench-llm/admin-unified'
import type { ProviderLifecycle } from '@/lib/bench-llm/provider-lifecycle'
import { groupUnifiedBenchModelsByProvider, sortUnifiedBenchModels, splitBenchProviderGroupsByQuestionnaire } from '@/lib/bench-llm/admin-unified'
import { parseComplAiCsv } from '@/lib/bench-llm/compl-ai-csv'
import { parseApiJson, toTitleCase } from '@/lib/utils'

const BenchLlmDetailContent = dynamic(
  () => import('./[id]/BenchLlmDetailPage').then((module) => module.BenchLlmDetailContent),
  {
    loading: () => (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" />
      </div>
    ),
  },
)

const FILTER_SOURCES: Array<{ key: BenchFilterableSourceKey; label: string }> = [
  { key: 'maydai', label: 'MaydAI' },
  { key: 'compl_ai', label: 'COMPL-AI' },
  { key: 'comparia', label: 'Compar:IA' },
  { key: 'llm_stats', label: 'LLM Stats' },
  { key: 'ecologits', label: 'EcoLogits' },
  { key: 'system_card', label: 'System Card' },
]

const CONSOLIDATION_SOURCES: Array<{ key: keyof BenchSourceCoverageMap; label: string; historyKey: string }> = [
  { key: 'llm_stats', label: 'LLM Stats', historyKey: 'llmStats' },
  { key: 'ecologits', label: 'EcoLogits', historyKey: 'ecologits' },
  { key: 'comparia', label: 'Compar:IA', historyKey: 'comparia' },
  { key: 'compl_ai', label: 'COMPL-AI', historyKey: 'complAi' },
  { key: 'system_card', label: 'System Card', historyKey: 'systemCard' },
]

const COVERAGE_KEYS: Array<keyof BenchSourceCoverageMap> = [
  'llm_stats',
  'ecologits',
  'comparia',
  'compl_ai',
  'maydai',
  'system_card',
]

const SORT_COLUMNS: Array<{ column: BenchSortColumn; label: string; align: 'left' | 'center' }> = [
  { column: 'model', label: 'Modèle', align: 'left' },
  { column: 'releaseDate', label: 'Date de sortie', align: 'center' },
  { column: 'status', label: 'Statut', align: 'center' },
  { column: 'all', label: 'All', align: 'center' },
  { column: 'maydai', label: 'MaydAI', align: 'center' },
  { column: 'complAi', label: 'COMPL-AI', align: 'center' },
  { column: 'comparia', label: 'Compar:IA', align: 'center' },
  { column: 'llmStats', label: 'LLM Stats', align: 'center' },
  { column: 'ecologits', label: 'EcoLogits', align: 'center' },
  { column: 'systemCard', label: 'System Card', align: 'center' },
]

const DESC_DEFAULT_SORTS = new Set<BenchSortColumn>(['releaseDate', 'all', 'maydai', 'complAi'])

type CoverageStat = BenchSourceCoverageMap[keyof BenchSourceCoverageMap]

type ApiResponse = {
  models: UnifiedBenchModel[]
  total: number
  page: number
  pageSize: number
  providers: string[]
  histories: Record<string, unknown[]>
  sourceCoverage?: BenchSourceCoverageMap
  role: 'admin' | 'super_admin'
  error?: string
}

type HistoryRow = {
  id?: string
  status?: string
  started_at?: string
  created_at?: string
  models_fetched?: number
  rows_imported?: number
  models_synced?: number
  rows_received?: number
  errors?: unknown
}

function historyModelsCount(row: HistoryRow): number | null {
  const value = row.models_fetched ?? row.rows_imported ?? row.models_synced ?? row.rows_received
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readRecord(value: object): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) record[key] = entry
  return record
}

function readHistoryRow(value: unknown): HistoryRow | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  const record = readRecord(value)
  const row: HistoryRow = {}
  if (typeof record.id === 'string') row.id = record.id
  if (typeof record.status === 'string') row.status = record.status
  if (typeof record.started_at === 'string') row.started_at = record.started_at
  if (typeof record.created_at === 'string') row.created_at = record.created_at
  if (typeof record.models_fetched === 'number' && Number.isFinite(record.models_fetched)) row.models_fetched = record.models_fetched
  if (typeof record.rows_imported === 'number' && Number.isFinite(record.rows_imported)) row.rows_imported = record.rows_imported
  if (typeof record.models_synced === 'number' && Number.isFinite(record.models_synced)) row.models_synced = record.models_synced
  if (typeof record.rows_received === 'number' && Number.isFinite(record.rows_received)) row.rows_received = record.rows_received
  if ('errors' in record) row.errors = record.errors
  return row
}

function readHistories(value: unknown): Record<string, HistoryRow[]> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {}
  const histories: Record<string, HistoryRow[]> = {}
  for (const [key, rows] of Object.entries(value)) {
    if (!Array.isArray(rows)) {
      histories[key] = []
      continue
    }
    histories[key] = rows.flatMap((item) => {
      const row = readHistoryRow(item)
      return row ? [row] : []
    })
  }
  return histories
}

function isCoverageStat(value: unknown): value is CoverageStat {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const fields = readRecord(value)
  if (typeof fields.totalInCatalog !== 'number' || !Number.isFinite(fields.totalInCatalog)) return false
  if (typeof fields.activeInCatalog !== 'number' || !Number.isFinite(fields.activeInCatalog)) return false
  if (typeof fields.deprecatedInCatalog !== 'number' || !Number.isFinite(fields.deprecatedInCatalog)) return false
  if (typeof fields.inServiceInCatalog !== 'number' || !Number.isFinite(fields.inServiceInCatalog)) return false
  if (typeof fields.catalogInServiceTotal !== 'number' || !Number.isFinite(fields.catalogInServiceTotal)) return false
  if (typeof fields.inServiceCompletionPercent !== 'number' || !Number.isFinite(fields.inServiceCompletionPercent)) return false
  if (fields.crossCoverage == null || typeof fields.crossCoverage !== 'object' || Array.isArray(fields.crossCoverage)) return false
  const cross = readRecord(fields.crossCoverage)
  return COVERAGE_KEYS.every((key) => typeof cross[key] === 'number' && Number.isFinite(cross[key]))
}

function readSourceCoverage(value: unknown): BenchSourceCoverageMap | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  const record = readRecord(value)
  const llmStats = record.llm_stats
  const ecologits = record.ecologits
  const comparia = record.comparia
  const complAi = record.compl_ai
  const maydai = record.maydai
  const systemCard = record.system_card
  if (!isCoverageStat(llmStats) || !isCoverageStat(ecologits) || !isCoverageStat(comparia)) return null
  if (!isCoverageStat(complAi) || !isCoverageStat(maydai) || !isCoverageStat(systemCard)) return null
  return {
    llm_stats: llmStats,
    ecologits,
    comparia,
    compl_ai: complAi,
    maydai,
    system_card: systemCard,
  }
}

function crossCovered(stat: CoverageStat, key: keyof BenchSourceCoverageMap): number {
  const value = stat.crossCoverage[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function coverageBadgeClass(covered: number, total: number): string {
  if (total > 0 && covered >= total) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (covered > 0 && covered < total) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-red-50 text-red-800 border-red-200'
}

function SourceCompletionPie({
  activeCount,
  deprecatedCount,
  totalInService,
  percent,
}: {
  activeCount: number
  deprecatedCount: number
  totalInService: number
  percent: number
}) {
  const safeTotal = Number.isFinite(totalInService) && totalInService > 0 ? totalInService : 0
  const safeActive = Number.isFinite(activeCount) && activeCount > 0 ? activeCount : 0
  const safeDeprecated = Number.isFinite(deprecatedCount) && deprecatedCount > 0 ? deprecatedCount : 0
  const activeArc = safeTotal > 0 ? Math.min(100, (safeActive / safeTotal) * 100) : 0
  const deprecatedArc = safeTotal > 0 ? Math.min(100 - activeArc, (safeDeprecated / safeTotal) * 100) : 0
  const safePercent = Number.isFinite(percent) ? percent : 0
  const title = `Couverture Actif + Déprécié : ${safeActive + safeDeprecated}/${safeTotal} (${safePercent}%) — ${safeActive} actif(s), ${safeDeprecated} déprécié(s)`

  return (
    <svg width={56} height={56} viewBox="0 0 36 36" role="img" aria-label={title} className="shrink-0">
      <title>{title}</title>
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" strokeWidth="3.8" pathLength={100} />
      {activeArc > 0 ? (
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.8"
          pathLength={100}
          strokeDasharray={`${activeArc} ${100 - activeArc}`}
          strokeDashoffset={25}
        />
      ) : null}
      {deprecatedArc > 0 ? (
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3.8"
          pathLength={100}
          strokeDasharray={`${deprecatedArc} ${100 - deprecatedArc}`}
          strokeDashoffset={25 - activeArc}
        />
      ) : null}
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        className="text-[11px] font-bold text-gray-900"
      >
        {safePercent}%
      </text>
    </svg>
  )
}

function parseLifecycleFilter(value: string): BenchLifecycleFilter {
  switch (value) {
    case 'all':
    case 'in_service':
    case 'active':
    case 'legacy':
    case 'deprecated':
    case 'retired':
    case 'none':
      return value
    default:
      return 'all'
  }
}

function parseSourceFilter(value: string): '' | BenchFilterableSourceKey {
  switch (value) {
    case 'maydai':
    case 'compl_ai':
    case 'comparia':
    case 'llm_stats':
    case 'ecologits':
    case 'system_card':
      return value
    default:
      return ''
  }
}

function initialSortDirection(column: BenchSortColumn): BenchSortDirection {
  return DESC_DEFAULT_SORTS.has(column) ? 'desc' : 'asc'
}

function formatReleaseDate(value: string | null | undefined): string | null {
  if (value == null || value.trim() === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('fr-FR')
}

function sourceDot(filled: number): { className: string; title: string } {
  const safeFilled = Number.isFinite(filled) ? Math.trunc(filled) : 0
  if (safeFilled <= 1) return { className: 'bg-red-700', title: '1/5 source renseignée' }
  if (safeFilled === 2) return { className: 'bg-red-400', title: '2/5 sources renseignées' }
  if (safeFilled === 3) return { className: 'bg-amber-500', title: '3/5 sources renseignées' }
  if (safeFilled === 4) return { className: 'bg-emerald-400', title: '4/5 sources renseignées' }
  return { className: 'bg-emerald-700', title: '5/5 sources renseignées' }
}

function Presence({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" /> Oui
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Non</span>
  )
}

function LifecycleBadge({ lifecycle }: { lifecycle: ProviderLifecycle | null }) {
  if (!lifecycle) return <span className="text-gray-400">—</span>
  const tone = {
    active: 'bg-emerald-50 text-emerald-800',
    legacy: 'bg-amber-50 text-amber-800',
    deprecated: 'bg-orange-50 text-orange-800',
    retired: 'bg-red-50 text-red-800',
  }[lifecycle.status]
  const title = [
    `Source ${lifecycle.source}`,
    lifecycle.sourceModelId,
    lifecycle.replacement ? `remplacé par ${lifecycle.replacement}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span title={title} className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone}`}>
      {lifecycle.label}
    </span>
  )
}

function RankCell({ rank }: { rank: number | null }) {
  if (rank == null) return <span className="text-gray-400">—</span>
  return <span className="font-medium text-gray-900">#{rank}</span>
}

function RatioCell({ filled, total, emptyDash = false }: { filled: number; total: number; emptyDash?: boolean }) {
  if (emptyDash && filled === 0) return <span className="text-gray-400">—</span>
  const complete = filled > 0 && filled >= total
  return (
    <span className={complete ? 'font-medium text-emerald-700' : filled === 0 ? 'text-gray-400' : 'font-medium text-gray-900'}>
      {filled}/{total}
    </span>
  )
}

function groupModelCount(groups: BenchProviderGroup[]): number {
  return groups.reduce((count, group) => count + group.models.length, 0)
}

function QuestionnaireSectionHeader({
  title,
  description,
  groups,
  tone,
}: {
  title: string
  description: string
  groups: BenchProviderGroup[]
  tone: 'questionnaire' | 'catalog'
}) {
  const toneClass =
    tone === 'questionnaire'
      ? 'bg-emerald-50 text-emerald-950'
      : 'bg-slate-100 text-slate-900'
  const metaClass = tone === 'questionnaire' ? 'text-emerald-800/80' : 'text-slate-600'
  return (
    <tr>
              <td colSpan={10} className={`px-4 py-3 ${toneClass}`}>
        <div className="font-semibold">{title}</div>
        <div className={`mt-0.5 text-xs font-normal ${metaClass}`}>
          {description} · {groups.length} fournisseur(s) · {groupModelCount(groups)} modèle(s)
        </div>
      </td>
    </tr>
  )
}

function ProviderGroupRows({
  groups,
  openProviders,
  onToggle,
  onSelect,
}: {
  groups: BenchProviderGroup[]
  openProviders: Set<string>
  onToggle: (providerName: string) => void
  onSelect: (entityId: string) => void
}) {
  return (
    <>
      {groups.map((group) => {
        const isOpen = openProviders.has(group.provider)
        return (
          <Fragment key={group.provider}>
            <tr className="bg-gray-50">
              <td colSpan={10} className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => onToggle(group.provider)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-wrap items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0080A3]"
                >
                  <ChevronRight className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="font-semibold text-gray-900">{group.provider}</span>
                  <span className="text-sm font-normal text-gray-500">
                    ({group.scoredCount}/{group.models.length} scorés)
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${group.activeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {group.activeCount} actif(s)
                  </span>
                  {group.deprecatedCount > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      {group.deprecatedCount} déprécié(s)
                    </span>
                  ) : null}
                  {group.inServiceMissingSystemCardCount > 0 ? (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                      ⚠️ {group.inServiceMissingSystemCardCount} actif(s)/déprécié(s) sans System Card
                    </span>
                  ) : null}
                  {group.inQuestionnaire ? (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 sm:ml-2">
                      Questionnaire
                    </span>
                  ) : (
                    <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:ml-2">
                      Catalogue
                    </span>
                  )}
                </button>
              </td>
            </tr>
            {isOpen
              ? group.models.map((model) => {
                  const releaseDate = formatReleaseDate(model.releaseDate)
                  const dot = sourceDot(model.metrics.sourcesFilled)
                  return (
                  <tr
                    key={model.entityId}
                    role="link"
                    tabIndex={0}
                    onClick={() => onSelect(model.entityId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(model.entityId)
                      }
                    }}
                    className="cursor-pointer hover:bg-sky-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0080A3]"
                  >
                    <td className="px-4 py-3 pl-10">
                      <div className="font-medium text-gray-900">{model.rawName || model.slug}</div>
                      <div className="text-xs text-gray-500">
                        {model.slug}
                        {model.active ? '' : ' · inactif'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      {releaseDate ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <LifecycleBadge lifecycle={model.lifecycle} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex flex-col items-center gap-1">
                        <span className="font-medium text-gray-900">
                          {model.metrics.sourcesFilled}/{model.metrics.sourcesTotal}
                        </span>
                        <span className={`h-2.5 w-2.5 rounded-full ${dot.className}`} title={dot.title} />
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {model.metrics.maydaiScore == null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className="font-medium text-gray-900">{model.metrics.maydaiScore}/100</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RatioCell filled={model.metrics.complAiFilled} total={model.metrics.complAiTotal} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RankCell rank={model.metrics.compariaRank} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RankCell rank={model.metrics.llmStatsRank} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Presence available={model.metrics.hasEcologits} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Presence available={model.metrics.hasSystemCard} />
                    </td>
                  </tr>
                  )
                })
              : null}
          </Fragment>
        )
      })}
    </>
  )
}

function parseCsv(text: string): Record<string, string>[] {
  return parseComplAiCsv(text)
}

function formatHistoryDate(row: HistoryRow): string {
  const value = row.started_at ?? row.created_at
  if (!value) return 'Date indisponible'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function FullScreenModelModal({
  entityId,
  onClose,
  onDeleted,
}: {
  entityId: string
  onClose: () => void
  onDeleted: () => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-gray-950/50 p-3 sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détails du modèle"
        className="h-full w-full max-w-7xl overflow-y-auto rounded-xl bg-gray-50 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0080A3]"
          >
            <X className="h-4 w-4" />
            Fermer
          </button>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <BenchLlmDetailContent
            id={entityId}
            modal
            onClose={onClose}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    </div>
  )
}

export default function BenchLlmsAdminPage() {
  const { getAccessToken } = useAuth()
  const importInput = useRef<HTMLInputElement>(null)
  const [models, setModels] = useState<UnifiedBenchModel[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [histories, setHistories] = useState<Record<string, HistoryRow[]>>({})
  const [sourceCoverage, setSourceCoverage] = useState<BenchSourceCoverageMap | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [provider, setProvider] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState<BenchLifecycleFilter>('all')
  const [source, setSource] = useState<'' | BenchFilterableSourceKey>('')
  const [availability, setAvailability] = useState('all')
  const [sortColumn, setSortColumn] = useState<BenchSortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<BenchSortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [openProviders, setOpenProviders] = useState<Set<string>>(new Set())
  const [importMode, setImportMode] = useState<'create' | 'update'>('update')
  const [createForm, setCreateForm] = useState({ model_name: '', model_provider: '', model_type: 'large-language-model', version: '' })
  const pageSize = 5000

  const providerGroups = useMemo(
    () =>
      groupUnifiedBenchModelsByProvider(models).map((group) => ({
        ...group,
        models: sortUnifiedBenchModels(group.models, sortColumn, sortDirection),
      })),
    [models, sortColumn, sortDirection],
  )
  const { inQuestionnaire: questionnaireGroups, catalogOnly: catalogGroups } = useMemo(
    () => splitBenchProviderGroupsByQuestionnaire(providerGroups),
    [providerGroups],
  )

  const handleSort = useCallback((column: BenchSortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column)
      setSortDirection(initialSortDirection(column))
      return
    }
    const initial = initialSortDirection(column)
    if (sortDirection === initial) {
      setSortDirection(initial === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortColumn(null)
    setSortDirection('desc')
  }, [sortColumn, sortDirection])

  const toggleProvider = useCallback((providerName: string) => {
    setOpenProviders((current) => {
      const next = new Set(current)
      if (next.has(providerName)) next.delete(providerName)
      else next.add(providerName)
      return next
    })
  }, [])

  const fetchModels = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: deferredSearch,
        provider,
        lifecycleStatus,
        source,
        availability,
      })
      const response = await fetch(`/api/admin/bench-llms?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await parseApiJson<ApiResponse>(response)
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible')
      setModels(Array.isArray(payload.models) ? payload.models : [])
      setProviders(Array.isArray(payload.providers) ? payload.providers : [])
      setTotal(typeof payload.total === 'number' && Number.isFinite(payload.total) ? payload.total : 0)
      setHistories(readHistories(payload.histories))
      setSourceCoverage(readSourceCoverage(payload.sourceCoverage))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [availability, deferredSearch, getAccessToken, lifecycleStatus, page, provider, source])

  useEffect(() => void fetchModels(), [fetchModels])
  useEffect(() => setPage(1), [availability, deferredSearch, lifecycleStatus, provider, source])
  useEffect(() => {
    if (deferredSearch.trim()) {
      setOpenProviders(new Set(providerGroups.map((group) => group.provider)))
    }
  }, [deferredSearch, providerGroups])
  const previousSearch = useRef(deferredSearch)
  useEffect(() => {
    const hadSearch = previousSearch.current.trim()
    previousSearch.current = deferredSearch
    if (hadSearch && !deferredSearch.trim()) setOpenProviders(new Set())
  }, [deferredSearch])

  const callAction = useCallback(async (name: string, url: string, options?: RequestInit) => {
    const token = getAccessToken()
    if (!token) return
    setAction(name)
    setError(null)
    setMessage(null)
    setToast(null)
    try {
      const response = await fetch(url, {
        method: 'POST',
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
      })
      const payload = await parseApiJson<{ error?: string; message?: string; success?: boolean }>(response)
      if ((!response.ok && response.status !== 207) || payload.success === false) {
        throw new Error(payload.error || payload.message || `${name} impossible`)
      }
      const successText = payload.message || `${name} terminé avec succès.`
      setMessage(successText)
      setToast({ message: successText, type: 'success' })
      await fetchModels()
    } catch (actionError) {
      const errorText = actionError instanceof Error ? actionError.message : 'Erreur inconnue'
      setError(errorText)
      setToast({ message: errorText, type: 'error' })
    } finally {
      setAction(null)
    }
  }, [fetchModels, getAccessToken])

  const createModel = useCallback(async () => {
    await callAction('Création du modèle', '/api/admin/compl-ai/models', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    setShowCreate(false)
  }, [callAction, createForm])

  const importCsv = useCallback(async (file: File) => {
    const csvData = parseCsv(await file.text())
    await callAction('Import COMPL-AI', '/api/admin/compl-ai/import-csv', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData, updateMode: importMode === 'update' }),
    })
  }, [callAction, importMode])

  const exportCsv = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setAction('Export COMPL-AI')
    try {
      const response = await fetch('/api/admin/compl-ai/export-csv', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Export impossible')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `compl-ai-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [getAccessToken])

  const downloadTemplate = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setAction('Modèle CSV')
    try {
      const response = await fetch('/api/admin/compl-ai/import-csv', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Téléchargement du modèle impossible')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'compl-ai-import-template.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Erreur inconnue')
    } finally {
      setAction(null)
    }
  }, [getAccessToken])

  return (
    <div className="pb-12">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-[#0080A3]" />
            <h1 className="text-2xl font-bold text-gray-900">Bench LLMs</h1>
          </div>
          <p className="mt-2 text-gray-600">Registre unifié des modèles et de leurs données de benchmark.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Modèle</button>
          <button onClick={() => callAction('Synchronisation LLM Stats', '/api/admin/llm-stats-sync-runs')} disabled={action != null} className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white">Sync LLM Stats</button>
          <button onClick={() => callAction('Synchronisation LLM Control', '/api/admin/llm-control-tower-sync')} disabled={action != null} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white">Sync LLM Control</button>
          <button onClick={() => callAction('Import System Cards', '/api/admin/llm-system-cards-import')} disabled={action != null} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white">Import System Cards</button>
          <button onClick={() => callAction('Synchronisation EcoLogits', '/api/admin/ecologits/sync')} disabled={action != null} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white"><Leaf className="h-4 w-4" /> Sync EcoLogits</button>
          <button onClick={() => callAction('Synchronisation Compar:IA', '/api/admin/comparia/sync')} disabled={action != null} className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white">Sync Compar:IA</button>
          <button onClick={() => callAction('Synchronisation COMPL-AI', '/api/admin/compl-ai/sync')} disabled={action != null} className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white">Sync COMPL-AI</button>
          <button onClick={() => callAction('Recalcul MaydAI', '/api/admin/compl-ai/recalculate-maydai-scores')} disabled={action != null} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Recalcul MaydAI</button>
          <button onClick={exportCsv} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Download className="h-4 w-4" /> CSV</button>
          <button onClick={downloadTemplate} disabled={action != null} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Modèle CSV</button>
          <select value={importMode} onChange={(event) => setImportMode(event.target.value === 'create' ? 'create' : 'update')} className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"><option value="update">Import : mettre à jour</option><option value="create">Import : créer</option></select>
          <button onClick={() => importInput.current?.click()} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium"><Upload className="h-4 w-4" /> Import</button>
          <button onClick={() => { if (confirm('Supprimer toutes les données COMPL-AI ? Cette action est irréversible.')) void callAction('Suppression COMPL-AI', '/api/admin/compl-ai/clear') }} disabled={action != null} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700"><Trash2 className="h-4 w-4" /> Vider COMPL-AI</button>
          <input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.target.value = '' }} />
          <button onClick={() => fetchModels()} className="rounded-md border border-gray-300 bg-white p-2" aria-label="Actualiser"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <section className="mt-7">
        <h2 className="text-lg font-semibold text-gray-900">Synchronisations récentes & Consolidation des sources</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CONSOLIDATION_SOURCES.map((card) => {
            const latest = histories[card.historyKey]?.[0]
            const stat = sourceCoverage?.[card.key] ?? null
            return (
              <div key={card.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">{card.label}</div>
                    {latest ? (
                      <div className="mt-2 text-sm text-gray-600">
                        <div>Statut : {latest.status ?? 'terminé'}</div>
                        <div>{historyModelsCount(latest) ?? '—'} modèle(s) sync</div>
                        <div className="mt-1 text-xs text-gray-500">{formatHistoryDate(latest)}</div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500">Aucun historique.</div>
                    )}
                  </div>
                  {stat ? (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <SourceCompletionPie
                        activeCount={stat.activeInCatalog}
                        deprecatedCount={stat.deprecatedInCatalog}
                        totalInService={stat.catalogInServiceTotal}
                        percent={stat.inServiceCompletionPercent}
                      />
                      <p className="max-w-24 text-center text-[10px] leading-tight text-gray-500">
                        Actif + Déprécié : {stat.inServiceInCatalog}/{stat.catalogInServiceTotal}
                      </p>
                    </div>
                  ) : null}
                </div>
                {stat ? (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700">
                      Consolidés : {stat.totalInCatalog} modèles ({stat.activeInCatalog} actif(s), {stat.deprecatedInCatalog} déprécié(s))
                    </p>
                    {stat.totalInCatalog > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {CONSOLIDATION_SOURCES.filter((other) => other.key !== card.key).map((other) => {
                          const covered = crossCovered(stat, other.key)
                          const pct = stat.totalInCatalog > 0 ? Math.round((covered / stat.totalInCatalog) * 100) : 0
                          return (
                            <span
                              key={other.key}
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${coverageBadgeClass(covered, stat.totalInCatalog)}`}
                            >
                              {other.label} {pct}% ({covered}/{stat.totalInCatalog})
                            </span>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {action ? <div className="mb-4 flex items-center gap-2 rounded-md bg-sky-50 p-3 text-sm text-sky-800"><Loader2 className="h-4 w-4 animate-spin" /> {action}…</div> : null}
      {error ? <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4" /> {error}</div> : null}
      {message ? <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Tous les fournisseurs</option>{providers.map((item) => <option key={item} value={item}>{toTitleCase(item)}</option>)}</select>
        <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(parseLifecycleFilter(event.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="in_service">En activité (Actif + Déprécié)</option>
          <option value="active">Actif</option>
          <option value="legacy">Legacy</option>
          <option value="deprecated">Déprécié</option>
          <option value="retired">Retiré</option>
          <option value="none">Sans statut</option>
        </select>
        <select value={source} onChange={(event) => setSource(parseSourceFilter(event.target.value))} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Toutes les sources</option>{FILTER_SOURCES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <select value={availability} onChange={(event) => setAvailability(event.target.value)} disabled={!source} className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"><option value="all">Disponible ou non</option><option value="present">Données présentes</option><option value="missing">Données absentes</option></select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {sortColumn != null ? (
          <div className="border-b border-gray-200 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setSortColumn(null)
                setSortDirection('desc')
              }}
              className="text-xs font-medium text-[#0080A3] hover:underline"
            >
              Réinitialiser le tri par défaut (Date &gt; System Card &gt; Statut)
            </button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {SORT_COLUMNS.map((column) => {
                  const active = sortColumn === column.column
                  const Icon = !active ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <th key={column.column} className={column.align === 'center' ? 'px-3 py-3 text-center' : 'px-4 py-3'}>
                      <button
                        type="button"
                        onClick={() => handleSort(column.column)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide ${column.align === 'center' ? 'justify-center' : ''} ${active ? 'text-[#0080A3]' : 'text-gray-500'}`}
                      >
                        {column.label}
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionnaireGroups.length > 0 ? (
                <>
                  <QuestionnaireSectionHeader
                    title="Disponibles dans les questionnaires MaydAI"
                    description="Proposées à la création d’un cas d’usage"
                    groups={questionnaireGroups}
                    tone="questionnaire"
                  />
                  <ProviderGroupRows
                    groups={questionnaireGroups}
                    openProviders={openProviders}
                    onToggle={toggleProvider}
                    onSelect={setSelectedModelId}
                  />
                </>
              ) : null}
              {catalogGroups.length > 0 ? (
                <>
                  <QuestionnaireSectionHeader
                    title="Pas encore dans les questionnaires"
                    description="Présentes au catalogue, pas encore listées pour les utilisateurs"
                    groups={catalogGroups}
                    tone="catalog"
                  />
                  <ProviderGroupRows
                    groups={catalogGroups}
                    openProviders={openProviders}
                    onToggle={toggleProvider}
                    onSelect={setSelectedModelId}
                  />
                </>
              ) : null}
              {!loading && models.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Aucun modèle.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#0080A3]" /></div> : null}
        <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          {total} modèle(s) · {questionnaireGroups.length} fournisseur(s) dans les questionnaires · {catalogGroups.length} hors questionnaires
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Créer un modèle</h2><button onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3">
              <input value={createForm.model_name} onChange={(event) => setCreateForm((value) => ({ ...value, model_name: event.target.value }))} placeholder="Nom" className="rounded-md border px-3 py-2" />
              <input value={createForm.model_provider} onChange={(event) => setCreateForm((value) => ({ ...value, model_provider: event.target.value }))} placeholder="Fournisseur" className="rounded-md border px-3 py-2" />
              <input value={createForm.version} onChange={(event) => setCreateForm((value) => ({ ...value, version: event.target.value }))} placeholder="Version" className="rounded-md border px-3 py-2" />
              <button disabled={!createForm.model_name || !createForm.model_provider || action != null} onClick={createModel} className="rounded-md bg-[#0080A3] px-4 py-2 font-medium text-white disabled:opacity-50">Créer</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedModelId ? (
        <FullScreenModelModal
          entityId={selectedModelId}
          onClose={() => setSelectedModelId(null)}
          onDeleted={() => void fetchModels()}
        />
      ) : null}

      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        isVisible={toast != null}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
