import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { toExplicitError } from '@/lib/errors/postgrest-error'
import { EcoLogitsLinkStatusSchema, type EcoLogitsLinkStatus } from '@/lib/bench-llm/veille-columns'
import { MaydaiTargetOptionSchema } from '@/types/bench-sources.zod'
import {
  buildEcologitsEstimateSummary,
  ExistingEcologitsLinkSchema,
  formatEcologitsArchitecture,
  preferEcologitsEstimateSummary,
  type EcologitsEstimateInput,
  type EcologitsEstimateSummary,
  type ExistingEcologitsLink,
  EcologitsQueueRowSchema,
} from '@/types/ecologits.zod'

const PAGE_SIZE = 1000

export class EcologitsLinkUpdateError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

type EcoRow = {
  id: string
  name: string
  normalized_name: string
  link_status: EcoLogitsLinkStatus
}

type PageResult = {
  data: unknown
  error: { message?: string | null; details?: string | null } | null
}

export async function fetchAllRows(
  loadPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await loadPage(from, from + PAGE_SIZE - 1)
    if (page.error) throw toExplicitError('EcoLogits fetchAllRows', page.error)
    if (!Array.isArray(page.data)) {
      throw new Error('Réponse Supabase illisible : la page n’est pas un tableau.')
    }
    rows.push(...page.data)
    if (page.data.length < PAGE_SIZE) break
  }
  return rows
}

function relationOne(value: unknown): unknown {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readEco(data: unknown): EcoRow {
  if (!isRecord(data)) {
    throw new EcologitsLinkUpdateError('Ligne EcoLogits illisible.')
  }
  const record = data
  const id = record.id
  const name = record.name
  const normalizedName = record.normalized_name
  const status = EcoLogitsLinkStatusSchema.safeParse(record.link_status)
  if (typeof id !== 'string' || typeof name !== 'string' || typeof normalizedName !== 'string' || !status.success) {
    throw new EcologitsLinkUpdateError('Ligne EcoLogits incomplète ou corrompue.')
  }
  return { id, name, normalized_name: normalizedName, link_status: status.data }
}

async function requireEco(supabase: SupabaseClient, ecologitsModelId: string): Promise<EcoRow> {
  const { data, error } = await supabase
    .from('ecologits_models')
    .select('id, name, normalized_name, link_status')
    .eq('id', ecologitsModelId)
    .maybeSingle()
  if (error) throw toExplicitError('EcoLogits lien', error)
  if (!data) throw new EcologitsLinkUpdateError('Modèle EcoLogits introuvable.', 404)
  return readEco(data)
}

async function requireMaydai(supabase: SupabaseClient, maydaiModelId: string): Promise<void> {
  const { data, error } = await supabase
    .from('compl_ai_models')
    .select('id')
    .eq('id', maydaiModelId)
    .maybeSingle()
  if (error) throw toExplicitError('EcoLogits lien', error)
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new EcologitsLinkUpdateError('Ce modèle MaydAI n’existe pas.', 404)
  }
}

type OtherEcoLink = {
  id: string
  provider: string
  name: string
  linkStatus: EcoLogitsLinkStatus
}

const OtherEcoSchema = z.object({
  provider: z.string(),
  name: z.string(),
  link_status: EcoLogitsLinkStatusSchema,
})

async function listOtherLinks(supabase: SupabaseClient, ecologitsModelId: string, maydaiModelId: string): Promise<OtherEcoLink[]> {
  const raw = await fetchAllRows((from, to) =>
    supabase
      .from('ecologits_model_links')
      .select('ecologits_model_id, eco:ecologits_models(provider, name, link_status)')
      .eq('maydai_model_id', maydaiModelId)
      .neq('ecologits_model_id', ecologitsModelId)
      .order('ecologits_model_id', { ascending: true })
      .range(from, to),
  )
  const others: OtherEcoLink[] = []
  for (const row of raw) {
    if (!isRecord(row) || typeof row.ecologits_model_id !== 'string') {
      throw new EcologitsLinkUpdateError('Lien EcoLogits existant illisible.')
    }
    const embedded = Array.isArray(row.eco) ? row.eco[0] : row.eco
    const parsed = OtherEcoSchema.safeParse(embedded)
    if (!parsed.success) {
      throw new EcologitsLinkUpdateError(`Entrée EcoLogits liée illisible (${row.ecologits_model_id}).`)
    }
    others.push({
      id: row.ecologits_model_id,
      provider: parsed.data.provider,
      name: parsed.data.name,
      linkStatus: parsed.data.link_status,
    })
  }
  return others
}

async function deleteLinks(supabase: SupabaseClient, ecologitsModelId: string): Promise<void> {
  const { error } = await supabase
    .from('ecologits_model_links')
    .delete()
    .eq('ecologits_model_id', ecologitsModelId)
  if (error) throw toExplicitError('EcoLogits lien', error)
}

async function deleteAliasBySourceId(supabase: SupabaseClient, ecologitsModelId: string): Promise<void> {
  const byId = await supabase
    .from('llm_model_aliases')
    .delete()
    .eq('source', 'ecologits')
    .eq('source_id', ecologitsModelId)
  if (byId.error) throw toExplicitError('EcoLogits alias', byId.error)
}

async function deleteAliases(supabase: SupabaseClient, eco: EcoRow): Promise<void> {
  const byId = await supabase
    .from('llm_model_aliases')
    .delete()
    .eq('source', 'ecologits')
    .eq('source_id', eco.id)
  if (byId.error) throw toExplicitError('EcoLogits alias', byId.error)
  const byName = await supabase
    .from('llm_model_aliases')
    .delete()
    .eq('source', 'ecologits')
    .eq('raw_name', eco.name)
  if (byName.error) throw toExplicitError('EcoLogits alias', byName.error)
}

async function setStatus(supabase: SupabaseClient, ecologitsModelId: string, status: EcoLogitsLinkStatus): Promise<void> {
  const { error } = await supabase
    .from('ecologits_models')
    .update({ link_status: status, updated_at: new Date().toISOString() })
    .eq('id', ecologitsModelId)
  if (error) throw toExplicitError('EcoLogits statut', error)
}

export type EcologitsConflictMode = 'require_explicit' | 'add' | 'replace_all'

async function attachEcologitsModel(
  supabase: SupabaseClient,
  eco: EcoRow,
  maydaiModelId: string,
): Promise<void> {
  await deleteLinks(supabase, eco.id)
  const inserted = await supabase.from('ecologits_model_links').insert({
    ecologits_model_id: eco.id,
    maydai_model_id: maydaiModelId,
    match_method: 'manual',
    updated_at: new Date().toISOString(),
  })
  if (inserted.error) throw toExplicitError('EcoLogits lien', inserted.error)
  await deleteAliases(supabase, eco)
  const alias = await supabase.from('llm_model_aliases').insert({
    model_id: maydaiModelId,
    source: 'ecologits',
    source_id: eco.id,
    raw_name: eco.name,
    normalized_name: eco.normalized_name,
    match_method: 'manual',
  })
  if (alias.error) throw toExplicitError('EcoLogits alias', alias.error)
  await setStatus(supabase, eco.id, 'matched')
}

export async function matchEcologitsModel(
  supabase: SupabaseClient,
  input: { ecologitsModelId: string; maydaiModelId: string; conflictMode?: EcologitsConflictMode },
): Promise<{ ecologitsModelId: string; maydaiModelId: string; status: 'matched' }> {
  const ecologitsModelId = input.ecologitsModelId
  const maydaiModelId = input.maydaiModelId
  const conflictMode = input.conflictMode ?? 'require_explicit'
  const eco = await requireEco(supabase, ecologitsModelId)
  await requireMaydai(supabase, maydaiModelId)
  const others = await listOtherLinks(supabase, ecologitsModelId, maydaiModelId)
  if (others.length > 0 && conflictMode === 'require_explicit') {
    const names = others.map((other) => `${other.provider}/${other.name}`).join(', ')
    throw new EcologitsLinkUpdateError(
      `Cette fiche MaydAI possède déjà ${others.length} lien(s) EcoLogits (${names}). Choisissez « Ajouter ce lien (N:1) » ou « Remplacer le(s) lien(s) existant(s) ».`,
      409,
    )
  }
  if (others.length > 0 && conflictMode === 'replace_all') {
    for (const other of others) {
      await deleteLinks(supabase, other.id)
      await deleteAliasBySourceId(supabase, other.id)
      if (other.linkStatus !== 'ignored') await setStatus(supabase, other.id, 'unmatched')
    }
  }
  await attachEcologitsModel(supabase, eco, maydaiModelId)
  return { ecologitsModelId, maydaiModelId, status: 'matched' }
}

export async function ignoreEcologitsModel(
  supabase: SupabaseClient,
  ecologitsModelId: string,
): Promise<{ ecologitsModelId: string; status: 'ignored' }> {
  const eco = await requireEco(supabase, ecologitsModelId)
  await deleteLinks(supabase, eco.id)
  await deleteAliases(supabase, eco)
  await setStatus(supabase, eco.id, 'ignored')
  return { ecologitsModelId: eco.id, status: 'ignored' }
}

export async function ignoreEcologitsModels(
  supabase: SupabaseClient,
  ecologitsModelIds: readonly string[],
): Promise<Array<{ ecologitsModelId: string; status: 'ignored' }>> {
  const results = []
  for (const id of ecologitsModelIds) results.push(await ignoreEcologitsModel(supabase, id))
  return results
}

async function releaseEcologitsModel(
  supabase: SupabaseClient,
  ecologitsModelId: string,
): Promise<{ ecologitsModelId: string; status: 'unmatched' }> {
  const eco = await requireEco(supabase, ecologitsModelId)
  await deleteLinks(supabase, eco.id)
  await deleteAliases(supabase, eco)
  await setStatus(supabase, eco.id, 'unmatched')
  return { ecologitsModelId: eco.id, status: 'unmatched' }
}

export async function unignoreEcologitsModel(supabase: SupabaseClient, ecologitsModelId: string) {
  return releaseEcologitsModel(supabase, ecologitsModelId)
}

export async function unlinkEcologitsModel(supabase: SupabaseClient, ecologitsModelId: string) {
  return releaseEcologitsModel(supabase, ecologitsModelId)
}

export async function unignoreEcologitsModels(
  supabase: SupabaseClient,
  ecologitsModelIds: readonly string[],
) {
  const results = []
  for (const id of ecologitsModelIds) results.push(await unignoreEcologitsModel(supabase, id))
  return results
}

export type EcologitsQueueStatus = EcoLogitsLinkStatus | 'all'

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

const EstimateRowSchema = z.object({
  ecologits_model_id: z.string().uuid(),
  output_token_count: z.union([z.number(), z.string()]).nullable().optional(),
  electricity_mix_zone: z.string().nullable().optional(),
  energy_min: z.union([z.number(), z.string()]).nullable().optional(),
  energy_max: z.union([z.number(), z.string()]).nullable().optional(),
  energy_unit: z.string().nullable().optional(),
  gwp_min: z.union([z.number(), z.string()]).nullable().optional(),
  gwp_max: z.union([z.number(), z.string()]).nullable().optional(),
  gwp_unit: z.string().nullable().optional(),
  adpe_min: z.union([z.number(), z.string()]).nullable().optional(),
  adpe_max: z.union([z.number(), z.string()]).nullable().optional(),
  pe_min: z.union([z.number(), z.string()]).nullable().optional(),
  pe_max: z.union([z.number(), z.string()]).nullable().optional(),
  wcf_min: z.union([z.number(), z.string()]).nullable().optional(),
  wcf_max: z.union([z.number(), z.string()]).nullable().optional(),
})

function estimateInputFromRow(row: z.infer<typeof EstimateRowSchema>): EcologitsEstimateInput {
  return {
    output_token_count: row.output_token_count ?? null,
    electricity_mix_zone: row.electricity_mix_zone ?? null,
    energy_min: row.energy_min ?? null,
    energy_max: row.energy_max ?? null,
    energy_unit: row.energy_unit ?? null,
    gwp_min: row.gwp_min ?? null,
    gwp_max: row.gwp_max ?? null,
    gwp_unit: row.gwp_unit ?? null,
    adpe_min: row.adpe_min ?? null,
    adpe_max: row.adpe_max ?? null,
    pe_min: row.pe_min ?? null,
    pe_max: row.pe_max ?? null,
    wcf_min: row.wcf_min ?? null,
    wcf_max: row.wcf_max ?? null,
  }
}

export async function loadEstimateSummaryByEcoId(supabase: SupabaseClient): Promise<Map<string, EcologitsEstimateSummary>> {
  const raw = await fetchAllRows((from, to) =>
    supabase
      .from('ecologits_estimates')
      .select('ecologits_model_id, output_token_count, electricity_mix_zone, energy_min, energy_max, energy_unit, gwp_min, gwp_max, gwp_unit, adpe_min, adpe_max, pe_min, pe_max, wcf_min, wcf_max')
      .order('ecologits_model_id', { ascending: true })
      .range(from, to),
  )
  const summaries = new Map<string, EcologitsEstimateSummary>()
  for (const row of raw) {
    const parsed = EstimateRowSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[EcoLogits Estimates] Ligne illisible.', parsed.error)
      continue
    }
    const summary = buildEcologitsEstimateSummary(estimateInputFromRow(parsed.data))
    const current = summaries.get(parsed.data.ecologits_model_id)
    summaries.set(parsed.data.ecologits_model_id, current ? preferEcologitsEstimateSummary(current, summary) : summary)
  }
  return summaries
}

const LinkCatalogSchema = z.object({
  maydai_model_id: z.string().uuid(),
  ecologits_model_id: z.string().uuid(),
  match_method: z.string(),
  eco: z.union([
    z.object({
      provider: z.string(),
      name: z.string(),
      is_active: z.boolean(),
      architecture: z.unknown().nullable().optional(),
    }),
    z.array(z.object({
      provider: z.string(),
      name: z.string(),
      is_active: z.boolean(),
      architecture: z.unknown().nullable().optional(),
    })),
  ]).nullable(),
})

export async function loadExistingEcologitsLinksByMaydai(
  supabase: SupabaseClient,
  summaries?: Map<string, EcologitsEstimateSummary>,
): Promise<Map<string, ExistingEcologitsLink[]>> {
  const estimateSummaries = summaries ?? await loadEstimateSummaryByEcoId(supabase)
  const raw = await fetchAllRows((from, to) =>
    supabase
      .from('ecologits_model_links')
      .select('maydai_model_id, ecologits_model_id, match_method, eco:ecologits_models(provider, name, is_active, architecture)')
      .order('ecologits_model_id', { ascending: true })
      .range(from, to),
  )
  const byMaydai = new Map<string, ExistingEcologitsLink[]>()
  for (const row of raw) {
    const parsed = LinkCatalogSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[EcoLogits Liens] Ligne illisible.', parsed.error)
      continue
    }
    const embedded = Array.isArray(parsed.data.eco) ? parsed.data.eco[0] ?? null : parsed.data.eco
    if (!embedded) {
      console.error('[EcoLogits Liens] Modèle lié introuvable.', parsed.data.ecologits_model_id)
      continue
    }
    const link = ExistingEcologitsLinkSchema.parse({
      ecologits_model_id: parsed.data.ecologits_model_id,
      provider: embedded.provider,
      name: embedded.name,
      match_method: parsed.data.match_method,
      is_active: embedded.is_active,
      architecture_label: formatEcologitsArchitecture(embedded.architecture),
      estimate_summary: estimateSummaries.get(parsed.data.ecologits_model_id) ?? buildEcologitsEstimateSummary(null),
    })
    const current = byMaydai.get(parsed.data.maydai_model_id) ?? []
    current.push(link)
    byMaydai.set(parsed.data.maydai_model_id, current)
  }
  return byMaydai
}

export async function loadMaydaiTargetOptions(
  supabase: SupabaseClient,
  summaries?: Map<string, EcologitsEstimateSummary>,
): Promise<{
  options: Array<z.infer<typeof MaydaiTargetOptionSchema>>
  rejected: string[]
}> {
  const [raw, linksByMaydai] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('compl_ai_models')
        .select('id, slug, model_name, model_provider, role, lifecycle_status')
        .order('model_name', { ascending: true })
        .range(from, to),
    ),
    loadExistingEcologitsLinksByMaydai(supabase, summaries),
  ])
  const options = []
  const rejected: string[] = []
  for (const row of raw) {
    if (!isRecord(row) || typeof row.id !== 'string' || typeof row.model_name !== 'string') {
      rejected.push('Option MaydAI corrompue.')
      console.error('[EcoLogits Queue] Option MaydAI corrompue.', row)
      continue
    }
    const parsed = MaydaiTargetOptionSchema.safeParse({
      id: row.id,
      slug: textOrNull(row.slug),
      model_name: row.model_name,
      model_provider: textOrNull(row.model_provider),
      role: textOrNull(row.role),
      lifecycle_status: textOrNull(row.lifecycle_status),
      existing_ecologits_links: linksByMaydai.get(row.id) ?? [],
    })
    if (!parsed.success) {
      rejected.push(`Option MaydAI ${row.model_name} rejetée.`)
      console.error('[EcoLogits Queue]', parsed.error)
      continue
    }
    options.push(parsed.data)
  }
  return { options, rejected }
}

export async function listEcologitsQueue(
  supabase: SupabaseClient,
  params: { status: EcologitsQueueStatus; search: string; page: number; pageSize: number },
) {
  const summaries = await loadEstimateSummaryByEcoId(supabase)
  const raw = await fetchAllRows((from, to) =>
    supabase.from('ecologits_models').select(`
      id, provider, name, normalized_provider, normalized_name, link_status, is_active, warnings, architecture,
      link:ecologits_model_links(match_method, maydai:compl_ai_models(id, slug, model_name, model_provider, lifecycle_status, role))
    `).order('name', { ascending: true }).range(from, to),
  )
  const rejected: string[] = []
  const rows = []
  const counts = { unmatched: 0, ignored: 0, matched: 0 }
  for (const item of raw) {
    if (!isRecord(item)) {
      rejected.push('Ligne EcoLogits illisible.')
      console.error('[EcoLogits Queue] Ligne illisible.', item)
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
      const message = `EcoLogits ${String(item.name ?? item.id)} rejeté.`
      rejected.push(message)
      console.error('[EcoLogits Queue]', message, parsed.error)
      continue
    }
    counts[parsed.data.link_status] += 1
    rows.push(parsed.data)
  }
  const needle = params.search.trim().toLowerCase()
  const filtered = rows.filter((row) => {
    if (params.status !== 'all' && row.link_status !== params.status) return false
    if (!needle) return true
    const haystack = [
      row.provider,
      row.name,
      row.linked_model?.model_name ?? '',
      row.linked_model?.slug ?? '',
      row.linked_model?.model_provider ?? '',
    ].join(' ').toLowerCase()
    return haystack.includes(needle)
  })
  const from = (params.page - 1) * params.pageSize
  const loadedOptions = await loadMaydaiTargetOptions(supabase, summaries)
  rejected.push(...loadedOptions.rejected)
  const maydaiOptions = loadedOptions.options
  return {
    status: params.status,
    counts,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
    rows: filtered.slice(from, from + params.pageSize),
    maydaiOptions,
    rejected,
  }
}
