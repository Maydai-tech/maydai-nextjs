import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CONTROL_TOWER_CANONICAL_HEADERS,
  CONTROL_TOWER_HEADER_GROUPS,
  columnIndexToA1,
  findControlTowerGroup,
  type ControlTowerHeaderGroup,
} from '@/lib/bench-llm/control-tower-headers'
import { readControlTowerSheetMatrix } from '@/lib/bench-llm/control-tower-csv'
import { fetchAllRows, loadEstimateSummaryByEcoId, loadMaydaiTargetOptions } from '@/lib/ecologits/link-actions'
import { toExplicitError } from '@/lib/errors/postgrest-error'
import {
  BenchSourceDetailResponseSchema,
  type BenchSourceDetailResponse,
  type BenchSourceSlug,
  type MaydaiTargetOption,
  type SheetGuidance,
} from '@/types/bench-sources.zod'
import {
  buildEcologitsEstimateSummary,
  EcologitsQueueRowSchema,
  formatEcologitsArchitecture,
} from '@/types/ecologits.zod'

type Rejected = { count: number; messages: string[] }

type MaydaiOptionBase = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
  role: string | null
  lifecycle_status: string | null
}

type FicheRow = MaydaiOptionBase & {
  created_at: string | null
  compl_ai_rank: number | null
  system_card_status: string | null
}

type SheetColumn = { column_letter: string; header: string; expected_hint: string }

const QUALIFY_COLUMNS: Array<{ group: ControlTowerHeaderGroup; hint: string }> = [
  { group: 'lineType', hint: 'Renseigner le type de ligne pour sortir la fiche de « à classer ».' },
  { group: 'taxonomyValidated', hint: 'Passer à Oui une fois la taxonomie validée.' },
  { group: 'fiche', hint: 'Indiquer Générée, ou le motif si la fiche technique est en erreur.' },
]

const MERGE_COLUMNS: Array<{ group: ControlTowerHeaderGroup; hint: string }> = [
  { group: 'merge', hint: 'UUID de la fiche MaydAI qui doit absorber celle-ci.' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function relationOne(value: unknown): unknown {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function noteRejected(rejected: Rejected, message: string, error: unknown): void {
  rejected.count += 1
  if (rejected.messages.length < 20) rejected.messages.push(message)
  console.error('[SourceReconcile]', message, error)
}

function columnHints(
  headers: readonly string[],
  definitions: ReadonlyArray<{ group: ControlTowerHeaderGroup; hint: string }>,
): SheetColumn[] {
  const hints: SheetColumn[] = []
  for (const definition of definitions) {
    const index = findControlTowerGroup(headers, definition.group)
    if (index < 0) continue
    const header = headers[index]?.trim() || CONTROL_TOWER_HEADER_GROUPS[definition.group][0]
    hints.push({
      column_letter: columnIndexToA1(index),
      header,
      expected_hint: definition.hint,
    })
  }
  return hints
}

export function controlTowerSheetColumns(headers: readonly string[] = CONTROL_TOWER_CANONICAL_HEADERS): {
  columns_to_qualify: SheetColumn[]
  columns_to_merge: SheetColumn[]
} {
  return {
    columns_to_qualify: columnHints(headers, QUALIFY_COLUMNS),
    columns_to_merge: columnHints(headers, MERGE_COLUMNS),
  }
}

async function loadSheetIndex(includeSheetMap: boolean): Promise<{
  columns: ReturnType<typeof controlTowerSheetColumns>
  rowsById: Map<string, number>
  sheetUrl: string | null
  sheetStatus: string | null
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim() || null
  const sheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null
  if (!includeSheetMap || !spreadsheetId) {
    return {
      columns: controlTowerSheetColumns(),
      rowsById: new Map(),
      sheetUrl,
      sheetStatus: includeSheetMap ? 'GOOGLE_SHEETS_CONTROL_TOWER_ID est absent.' : null,
    }
  }
  try {
    const matrix = await readControlTowerSheetMatrix(spreadsheetId)
    const headers = (matrix[0] ?? []).map((cell) => String(cell ?? ''))
    const idIndex = findControlTowerGroup(headers, 'id')
    const rowsById = new Map<string, number>()
    if (idIndex >= 0) {
      matrix.forEach((row, index) => {
        const id = String(row?.[idIndex] ?? '').trim()
        if (id) rowsById.set(id, index + 1)
      })
    }
    return { columns: controlTowerSheetColumns(headers), rowsById, sheetUrl, sheetStatus: null }
  } catch (error) {
    console.error('[SourceReconcile SheetMap]', error)
    const message = error instanceof Error ? error.message : 'Lecture du Google Sheet impossible.'
    return { columns: controlTowerSheetColumns(), rowsById: new Map(), sheetUrl, sheetStatus: message }
  }
}

function guidanceFor(
  modelId: string,
  sheet: Awaited<ReturnType<typeof loadSheetIndex>>,
): SheetGuidance {
  const rowNumber = sheet.rowsById.get(modelId) ?? null
  return {
    sheet_url: sheet.sheetUrl,
    row_number: rowNumber,
    in_sheet: rowNumber != null,
    sheet_status: sheet.sheetStatus,
    columns_to_qualify: sheet.columns.columns_to_qualify,
    columns_to_merge: sheet.columns.columns_to_merge,
  }
}

async function loadMaydaiOptions(supabase: SupabaseClient, rejected: Rejected): Promise<MaydaiTargetOption[]> {
  const loaded = await loadMaydaiTargetOptions(supabase)
  loaded.rejected.forEach((message, index) => noteRejected(rejected, message || `Option MaydAI ${index + 1} corrompue.`, message))
  return loaded.options
}

function llmStatsBadgeLabel(aClasserCount: number, lastRunErrorCount: number, nullRoleCount: number): string {
  const parts: string[] = []
  if (aClasserCount > 0) parts.push(`${aClasserCount} à classer`)
  if (lastRunErrorCount > 0) parts.push(`${lastRunErrorCount} erreur(s)`)
  parts.push(`${nullRoleCount} hors questionnaire`)
  return parts.join(' · ')
}

function isComplAiFailureStatus(status: string | null): boolean {
  return status !== 'success'
}

async function loadFiches(supabase: SupabaseClient, rejected: Rejected): Promise<FicheRow[]> {
  const raw = await fetchAllRows((from, to) =>
    supabase
      .from('compl_ai_models')
      .select('id, slug, model_name, model_provider, role, lifecycle_status, created_at, compl_ai_rank, system_card_status')
      .order('model_name', { ascending: true })
      .range(from, to),
  )
  const fiches: FicheRow[] = []
  raw.forEach((row, index) => {
    if (!isRecord(row) || typeof row.id !== 'string' || typeof row.model_name !== 'string') {
      noteRejected(rejected, `Fiche ${index + 1} corrompue.`, row)
      return
    }
    fiches.push({
      id: row.id,
      slug: textOrNull(row.slug),
      model_name: row.model_name,
      model_provider: textOrNull(row.model_provider),
      role: textOrNull(row.role),
      lifecycle_status: textOrNull(row.lifecycle_status),
      created_at: textOrNull(row.created_at),
      compl_ai_rank: typeof row.compl_ai_rank === 'number' ? row.compl_ai_rank : null,
      system_card_status: textOrNull(row.system_card_status),
    })
  })
  return fiches
}

function unqualified(fiche: FicheRow, ids: ReadonlySet<string>, sheet: Awaited<ReturnType<typeof loadSheetIndex>>) {
  if (!ids.has(fiche.id)) return null
  if (fiche.role !== 'a_classer' && fiche.role !== null) return null
  return {
    id: fiche.id,
    slug: fiche.slug,
    model_name: fiche.model_name,
    model_provider: fiche.model_provider,
    role: fiche.role,
    lifecycle_status: fiche.lifecycle_status,
    created_at: fiche.created_at,
    guidance: guidanceFor(fiche.id, sheet),
  }
}

function parseLlmError(message: string) {
  const matched = /^([^/]+)\/([^:]+):\s*(.*)$/.exec(message)
  return {
    message,
    provider: matched?.[1]?.trim() ?? null,
    model_name: matched?.[2]?.trim() ?? null,
    conflict: message.includes('compl_ai_models_provider_name_key') ? 'compl_ai_models_provider_name_key' : null,
  }
}

async function latestRows(supabase: SupabaseClient, table: 'llm_stats_sync_runs' | 'ecologits_sync_runs' | 'comparia_import_runs' | 'compl_ai_sync_logs', orderColumn: string) {
  const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: false }).limit(5)
  if (error) throw toExplicitError(`SourceReconcile ${table}`, error)
  return Array.isArray(data) ? data.filter(isRecord) : []
}

function headerFromFiches(
  fiches: FicheRow[],
  presentIds: ReadonlySet<string>,
  lastRun: { status: string | null; modelsSynced: number | null; startedAt: string | null } | null,
  actionableCount: number,
  actionableLabel: string,
) {
  const inService = fiches.filter((fiche) => fiche.lifecycle_status === 'active' || fiche.lifecycle_status === 'deprecated')
  const present = fiches.filter((fiche) => presentIds.has(fiche.id))
  const activeInCatalog = present.filter((fiche) => fiche.lifecycle_status === 'active').length
  const deprecatedInCatalog = present.filter((fiche) => fiche.lifecycle_status === 'deprecated').length
  const inServiceInCatalog = activeInCatalog + deprecatedInCatalog
  return {
    catalogInServiceTotal: inService.length,
    activeInCatalog,
    deprecatedInCatalog,
    inServiceInCatalog,
    totalInCatalog: present.length,
    inServiceCompletionPercent: inService.length > 0 ? Math.round((inServiceInCatalog / inService.length) * 100) : 0,
    lastRun,
    actionableCount,
    actionableLabel,
  }
}

async function ecologitsDetail(supabase: SupabaseClient, fiches: FicheRow[], options: MaydaiTargetOption[], rejected: Rejected, sheet: Awaited<ReturnType<typeof loadSheetIndex>>) {
  const summaries = await loadEstimateSummaryByEcoId(supabase)
  const raw = await fetchAllRows((from, to) =>
    supabase.from('ecologits_models').select(`
      id, provider, name, normalized_provider, normalized_name, link_status, is_active, warnings, architecture,
      link:ecologits_model_links(match_method, maydai:compl_ai_models(id, slug, model_name, model_provider, lifecycle_status, role))
    `).order('name', { ascending: true }).range(from, to),
  )
  const rows = []
  const counts = { unmatched: 0, ignored: 0, matched: 0 }
  const present = new Set<string>()
  for (const item of raw) {
    if (!isRecord(item)) {
      noteRejected(rejected, 'Ligne EcoLogits illisible.', item)
      continue
    }
    const link = relationOne(item.link)
    const maydai = isRecord(link) ? relationOne(link.maydai) : null
    const linked = isRecord(maydai) && isRecord(link) && typeof maydai.id === 'string' && typeof maydai.model_name === 'string'
      ? {
        id: maydai.id,
        slug: textOrNull(maydai.slug),
        model_name: maydai.model_name,
        model_provider: textOrNull(maydai.model_provider),
        lifecycle_status: textOrNull(maydai.lifecycle_status),
        role: textOrNull(maydai.role),
        match_method: link.match_method,
      }
      : null
    if (isRecord(maydai) && typeof maydai.id === 'string') present.add(maydai.id)
    const parsed = EcologitsQueueRowSchema.safeParse({
      id: item.id,
      provider: item.provider,
      name: item.name,
      normalized_provider: item.normalized_provider,
      normalized_name: item.normalized_name,
      link_status: item.link_status,
      is_active: item.is_active,
      warnings: Array.isArray(item.warnings) ? item.warnings : null,
      architecture: item.architecture ?? null,
      architecture_label: formatEcologitsArchitecture(item.architecture),
      estimate_summary: typeof item.id === 'string'
        ? summaries.get(item.id) ?? buildEcologitsEstimateSummary(null)
        : buildEcologitsEstimateSummary(null),
      linked_model: linked,
    })
    if (!parsed.success) {
      noteRejected(rejected, `EcoLogits ${String(item.name ?? item.id)} rejeté.`, parsed.error)
      continue
    }
    counts[parsed.data.link_status] += 1
    rows.push(parsed.data)
  }
  const runs = await latestRows(supabase, 'ecologits_sync_runs', 'started_at')
  const latest = runs[0]
  const errors = Array.isArray(latest?.errors) ? latest.errors.filter((entry): entry is string => typeof entry === 'string') : []
  return {
    source: 'ecologits' as const,
    header: headerFromFiches(fiches, present, latest ? {
      status: textOrNull(latest.status),
      modelsSynced: typeof latest.models_fetched === 'number' ? latest.models_fetched : null,
      startedAt: textOrNull(latest.started_at),
    } : null, counts.unmatched, `${counts.unmatched} à rapprocher`),
    maydaiOptions: options,
    rejected,
    counts,
    rows,
    lastRunErrors: errors,
  }
}

export async function loadBenchSourceDetail(
  supabase: SupabaseClient,
  source: BenchSourceSlug,
  options: { includeSheetMap?: boolean } = {},
): Promise<BenchSourceDetailResponse> {
  const rejected: Rejected = { count: 0, messages: [] }
  const sheet = await loadSheetIndex(options.includeSheetMap === true)
  const [fiches, maydaiOptions] = await Promise.all([
    loadFiches(supabase, rejected),
    loadMaydaiOptions(supabase, rejected),
  ])
  const payload = source === 'ecologits'
    ? await ecologitsDetail(supabase, fiches, maydaiOptions, rejected, sheet)
    : await otherSourceDetail(supabase, source, fiches, maydaiOptions, rejected, sheet)
  const parsed = BenchSourceDetailResponseSchema.safeParse(payload)
  if (!parsed.success) {
    console.error('[SourceReconcile]', parsed.error)
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(' ; ') || 'Réponse source invalide.')
  }
  return parsed.data
}

async function otherSourceDetail(
  supabase: SupabaseClient,
  source: Exclude<BenchSourceSlug, 'ecologits'>,
  fiches: FicheRow[],
  maydaiOptions: MaydaiTargetOption[],
  rejected: Rejected,
  sheet: Awaited<ReturnType<typeof loadSheetIndex>>,
) {
  if (source === 'comparia') return compariaDetail(supabase, fiches, maydaiOptions, rejected)
  if (source === 'llm-stats') return llmStatsDetail(supabase, fiches, maydaiOptions, rejected, sheet)
  if (source === 'compl-ai') return complAiDetail(supabase, fiches, maydaiOptions, rejected, sheet)
  return systemCardDetail(supabase, fiches, maydaiOptions, rejected, sheet)
}

async function compariaDetail(supabase: SupabaseClient, fiches: FicheRow[], maydaiOptions: MaydaiTargetOption[], rejected: Rejected) {
  const raw = await fetchAllRows((from, to) =>
    supabase.from('comparia_models').select('link_status, maydai_model_id').range(from, to),
  )
  const counts = { unmatched: 0, ignored: 0, matched: 0 }
  const present = new Set<string>()
  for (const row of raw) {
    if (!isRecord(row) || (row.link_status !== 'unmatched' && row.link_status !== 'ignored' && row.link_status !== 'matched')) {
      noteRejected(rejected, 'Ligne Compar:IA corrompue.', row)
      continue
    }
    counts[row.link_status] += 1
    if (typeof row.maydai_model_id === 'string') present.add(row.maydai_model_id)
  }
  const runs = await latestRows(supabase, 'comparia_import_runs', 'started_at')
  const latest = runs[0]
  const errors = Array.isArray(latest?.errors) ? latest.errors.filter((entry): entry is string => typeof entry === 'string') : []
  return {
    source: 'comparia' as const,
    header: headerFromFiches(fiches, present, latest ? {
      status: textOrNull(latest.status),
      modelsSynced: typeof latest.rows_imported === 'number' ? latest.rows_imported : null,
      startedAt: textOrNull(latest.started_at),
    } : null, counts.unmatched, `${counts.unmatched} à rapprocher`),
    maydaiOptions,
    rejected,
    counts,
    lastRun: latest ? {
      status: textOrNull(latest.status),
      rows_imported: typeof latest.rows_imported === 'number' ? latest.rows_imported : null,
      unmatched_count: typeof latest.unmatched_count === 'number' ? latest.unmatched_count : null,
      ignored_count: typeof latest.ignored_count === 'number' ? latest.ignored_count : null,
      matched_count: typeof latest.matched_count === 'number' ? latest.matched_count : null,
      errors,
    } : null,
  }
}

async function sourceIdSet(supabase: SupabaseClient, source: 'llm_stats' | 'ecologits' | 'comparia'): Promise<Set<string>> {
  const raw = await fetchAllRows((from, to) =>
    supabase.from('llm_model_source_ids').select('model_id').eq('source', source).range(from, to),
  )
  const ids = new Set<string>()
  for (const row of raw) {
    if (isRecord(row) && typeof row.model_id === 'string') ids.add(row.model_id)
  }
  return ids
}

async function llmStatsDetail(supabase: SupabaseClient, fiches: FicheRow[], maydaiOptions: MaydaiTargetOption[], rejected: Rejected, sheet: Awaited<ReturnType<typeof loadSheetIndex>>) {
  const ids = await sourceIdSet(supabase, 'llm_stats')
  const runs = await latestRows(supabase, 'llm_stats_sync_runs', 'started_at')
  const latest = runs[0]
  const created = Array.isArray(latest?.created_models) ? latest.created_models.flatMap((item) => {
    if (!isRecord(item) || typeof item.model_name !== 'string') {
      noteRejected(rejected, 'Modèle créé LLM Stats illisible.', item)
      return []
    }
    return [{ id: textOrNull(item.id), model_name: item.model_name, model_provider: textOrNull(item.model_provider) }]
  }) : []
  const errors = Array.isArray(latest?.errors) ? latest.errors.flatMap((item) => typeof item === 'string' ? [parseLlmError(item)] : []) : []
  const models = fiches.flatMap((fiche) => {
    const row = unqualified(fiche, ids, sheet)
    return row ? [row] : []
  })
  const aClasserCount = models.filter((model) => model.role === 'a_classer').length
  const nullRoleCount = models.filter((model) => model.role === null).length
  return {
    source: 'llm-stats' as const,
    header: headerFromFiches(fiches, ids, latest ? {
      status: textOrNull(latest.status),
      modelsSynced: typeof latest.models_fetched === 'number' ? latest.models_fetched : null,
      startedAt: textOrNull(latest.started_at),
    } : null, aClasserCount + errors.length, llmStatsBadgeLabel(aClasserCount, errors.length, nullRoleCount)),
    maydaiOptions,
    rejected,
    unqualified_models: models,
    last_run_issues: latest ? {
      status: textOrNull(latest.status),
      started_at: textOrNull(latest.started_at),
      created_models: created,
      errors,
    } : null,
  }
}

async function complAiDetail(supabase: SupabaseClient, fiches: FicheRow[], maydaiOptions: MaydaiTargetOption[], rejected: Rejected, sheet: Awaited<ReturnType<typeof loadSheetIndex>>) {
  const raw = await fetchAllRows((from, to) =>
    supabase.from('compl_ai_evaluations').select('model_id').range(from, to),
  )
  const evaluated = new Set<string>()
  for (const row of raw) {
    if (isRecord(row) && typeof row.model_id === 'string') evaluated.add(row.model_id)
  }
  const ids = new Set(fiches.filter((fiche) => evaluated.has(fiche.id) || fiche.compl_ai_rank != null || fiche.role === 'a_classer').map((fiche) => fiche.id))
  const models = fiches.flatMap((fiche) => {
    const row = unqualified(fiche, ids, sheet)
    return row ? [row] : []
  })
  const logs = await latestRows(supabase, 'compl_ai_sync_logs', 'created_at')
  const issues = logs.map((log) => ({
    sync_date: textOrNull(log.sync_date),
    status: textOrNull(log.status),
    models_synced: typeof log.models_synced === 'number' ? log.models_synced : null,
    evaluations_synced: typeof log.evaluations_synced === 'number' ? log.evaluations_synced : null,
    error_message: textOrNull(log.error_message),
  }))
  const errorCount = issues.filter((issue) => isComplAiFailureStatus(issue.status)).length
  return {
    source: 'compl-ai' as const,
    header: headerFromFiches(fiches, ids, issues[0] ? {
      status: issues[0].status,
      modelsSynced: issues[0].models_synced,
      startedAt: issues[0].sync_date,
    } : null, models.length, `${models.length} à classer · ${errorCount} journaux en erreur`),
    maydaiOptions,
    rejected,
    unqualified_models: models,
    last_run_issues: issues,
  }
}

async function systemCardDetail(supabase: SupabaseClient, fiches: FicheRow[], maydaiOptions: MaydaiTargetOption[], rejected: Rejected, sheet: Awaited<ReturnType<typeof loadSheetIndex>>) {
  void supabase
  void rejected
  const inService = fiches.filter((fiche) => fiche.lifecycle_status === 'active' || fiche.lifecycle_status === 'deprecated')
  const buckets = (['missing', 'error_no_system_card', 'generated'] as const).map((status) => ({
    system_card_status: status,
    models: inService.filter((fiche) => fiche.system_card_status === status).map((fiche) => ({
      id: fiche.id,
      slug: fiche.slug,
      model_name: fiche.model_name,
      model_provider: fiche.model_provider,
      role: fiche.role,
      lifecycle_status: fiche.lifecycle_status,
      created_at: fiche.created_at,
      guidance: guidanceFor(fiche.id, sheet),
    })),
  }))
  const missing = (buckets.find((bucket) => bucket.system_card_status === 'missing')?.models.length ?? 0)
    + (buckets.find((bucket) => bucket.system_card_status === 'error_no_system_card')?.models.length ?? 0)
  const present = new Set(inService.filter((fiche) => fiche.system_card_status === 'generated').map((fiche) => fiche.id))
  return {
    source: 'system-card' as const,
    header: headerFromFiches(fiches, present, null, missing, `${missing} manquantes`),
    maydaiOptions,
    rejected,
    buckets,
  }
}

export async function loadUnclassifiedModels(supabase: SupabaseClient) {
  const raw = await fetchAllRows((from, to) =>
    supabase
      .from('compl_ai_models')
      .select('id, slug, model_name, model_provider, lifecycle_status, created_at')
      .eq('role', 'a_classer')
      .order('created_at', { ascending: false })
      .range(from, to),
  )
  return raw.flatMap((row) => {
    if (!isRecord(row) || typeof row.id !== 'string' || typeof row.model_name !== 'string') {
      console.error('[SourceReconcile] Fiche à classer corrompue.', row)
      return []
    }
    return [{
      id: row.id,
      slug: textOrNull(row.slug),
      model_name: row.model_name,
      model_provider: textOrNull(row.model_provider),
      lifecycle_status: textOrNull(row.lifecycle_status),
      created_at: textOrNull(row.created_at),
    }]
  })
}

export type OrphanSummary = { actionableCount: number; label: string }

export async function loadOrphanSummaries(supabase: SupabaseClient): Promise<{
  ecologits: OrphanSummary
  comparia: OrphanSummary
  llm_stats: OrphanSummary
  compl_ai: OrphanSummary
  system_card: OrphanSummary
}> {
  const rejected: Rejected = { count: 0, messages: [] }
  const fiches = await loadFiches(supabase, rejected)
  const [eco, comparia, llmIds] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('ecologits_models').select('link_status').range(from, to)),
    fetchAllRows((from, to) => supabase.from('comparia_models').select('link_status').range(from, to)),
    sourceIdSet(supabase, 'llm_stats'),
  ])
  const ecoUnmatched = eco.filter((row) => isRecord(row) && row.link_status === 'unmatched').length
  const compariaUnmatched = comparia.filter((row) => isRecord(row) && row.link_status === 'unmatched').length
  const llmLinked = fiches.filter((fiche) => llmIds.has(fiche.id))
  const aClasserCount = llmLinked.filter((fiche) => fiche.role === 'a_classer').length
  const nullRoleCount = llmLinked.filter((fiche) => fiche.role === null).length
  const runs = await latestRows(supabase, 'llm_stats_sync_runs', 'started_at')
  const errorCount = Array.isArray(runs[0]?.errors) ? runs[0].errors.length : 0
  const logs = await latestRows(supabase, 'compl_ai_sync_logs', 'created_at')
  const complErrors = logs.filter((log) => isComplAiFailureStatus(textOrNull(log.status))).length
  const evaluated = await fetchAllRows((from, to) => supabase.from('compl_ai_evaluations').select('model_id').range(from, to))
  const evaluatedIds = new Set(evaluated.flatMap((row) => isRecord(row) && typeof row.model_id === 'string' ? [row.model_id] : []))
  const complUnqualified = fiches.filter((fiche) =>
    (evaluatedIds.has(fiche.id) || fiche.compl_ai_rank != null || fiche.role === 'a_classer')
    && (fiche.role === 'a_classer' || fiche.role === null),
  ).length
  const missingCards = fiches.filter((fiche) =>
    (fiche.lifecycle_status === 'active' || fiche.lifecycle_status === 'deprecated')
    && fiche.system_card_status !== 'generated',
  ).length
  return {
    ecologits: { actionableCount: ecoUnmatched, label: `${ecoUnmatched} à rapprocher` },
    comparia: { actionableCount: compariaUnmatched, label: `${compariaUnmatched} à rapprocher` },
    llm_stats: {
      actionableCount: aClasserCount + errorCount,
      label: llmStatsBadgeLabel(aClasserCount, errorCount, nullRoleCount),
    },
    compl_ai: { actionableCount: complUnqualified, label: `${complUnqualified} à classer · ${complErrors} journaux en erreur` },
    system_card: { actionableCount: missingCards, label: `${missingCards} manquantes` },
  }
}
