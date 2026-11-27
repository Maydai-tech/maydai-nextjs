import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { CompariaLinkUpdateError, updateCompariaLink, type CompariaLinkAction } from '@/lib/comparia/link-actions'
import { compariaQueueCounts, compariaRowVisible, sortCompariaQueue } from '@/lib/comparia/reconcile-visibility'
import { suggestMaydaiModelForComparia, type MaydaiSuggestionModel } from '@/lib/comparia/suggestions'
import { toExplicitError } from '@/lib/errors/postgrest-error'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'
import {
  CompariaActivityFilterSchema,
  CompariaMaydaiOptionSchema,
  CompariaQueueRowSchema,
  CompariaQueueStatusSchema,
  type CompariaMaydaiOption,
  type CompariaQueueRow,
} from '@/types/comparia.zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PAGE_SIZE = 1000
const COMPARIA_COLUMNS = 'id, source_id, organisation, rank, parameters_billions, consumption_mwh_per_1k_tokens, bradley_terry_score, license, size, release_date, is_active, missing_since, link_status, maydai_model_id, match_method, linked_model:compl_ai_models(id, slug, model_name, model_provider)'

type PageResult = {
  data: unknown
  error: { message?: string | null; details?: string | null } | null
}

function readVariants(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

function toSuggestionModel(model: CompariaMaydaiOption): MaydaiSuggestionModel {
  return {
    id: model.id,
    slug: model.slug,
    model_name: model.model_name,
    model_provider: model.model_provider,
    short_name: model.short_name ?? null,
    long_name: model.long_name ?? null,
    variants: readVariants(model.variants),
    merged_into_id: model.merged_into_id ?? null,
  }
}

function isAction(value: unknown): value is CompariaLinkAction {
  return value === 'match' || value === 'ignore' || value === 'unignore'
}

async function fetchPages(
  loadPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await loadPage(from, from + PAGE_SIZE - 1)
    if (page.error) throw toExplicitError('Admin Compar:IA Reconcile', page.error)
    if (!Array.isArray(page.data)) {
      throw new Error('Réponse Compar:IA illisible : la page n’est pas un tableau.')
    }
    rows.push(...page.data)
    if (page.data.length < PAGE_SIZE) break
  }
  return rows
}

function parseCatalog(rows: unknown[]): CompariaQueueRow[] {
  return rows.map((row, index) => {
    const parsed = CompariaQueueRowSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[Admin Compar:IA Reconcile]', parsed.error)
      throw new Error(`Ligne Compar:IA ${index + 1} illisible.`)
    }
    return parsed.data
  })
}

function parseOptions(rows: unknown[]): CompariaMaydaiOption[] {
  return rows.flatMap((row, index) => {
    const parsed = CompariaMaydaiOptionSchema.safeParse(row)
    if (!parsed.success) {
      console.error('[Admin Compar:IA Reconcile]', `Option MaydAI ${index + 1} rejetée.`, parsed.error)
      return []
    }
    return [parsed.data]
  })
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const statusParsed = CompariaQueueStatusSchema.safeParse(request.nextUrl.searchParams.get('status') ?? 'unmatched')
  if (!statusParsed.success) {
    return NextResponse.json({ error: 'Statut Compar:IA invalide.' }, { status: 400 })
  }
  const activityRaw = request.nextUrl.searchParams.get('activity')
  const activityParsed = CompariaActivityFilterSchema.safeParse(activityRaw ?? undefined)
  if (!activityParsed.success) {
    return NextResponse.json({ error: 'Filtre d’activité Compar:IA invalide.' }, { status: 400 })
  }
  const status = statusParsed.data
  const activity = activityParsed.data
  const supabase = createEcoLogitsServiceClient()

  try {
    const [rawRows, rawModels] = await Promise.all([
      fetchPages((from, to) =>
        supabase
          .from('comparia_models')
          .select(COMPARIA_COLUMNS)
          .order('is_active', { ascending: false })
          .order('rank', { ascending: true })
          .order('source_id', { ascending: true })
          .range(from, to),
      ),
      fetchPages((from, to) =>
        supabase
          .from('compl_ai_models')
          .select('id, slug, model_name, model_provider, short_name, long_name, variants, merged_into_id')
          .order('model_name', { ascending: true })
          .range(from, to),
      ),
    ])
    const catalog = sortCompariaQueue(parseCatalog(rawRows))
    const suggestionModels = parseOptions(rawModels).map(toSuggestionModel)
    const visible = catalog.filter((row) => compariaRowVisible(row, status, activity))
    return NextResponse.json({
      status,
      activity,
      counts: compariaQueueCounts(catalog),
      rows: visible.map((row) => ({
        ...row,
        suggestionId: row.link_status === 'unmatched'
          ? suggestMaydaiModelForComparia(row, suggestionModels)?.id ?? null
          : null,
      })),
      models: suggestionModels.map((model) => ({
        id: model.id,
        slug: model.slug ?? null,
        model_name: model.model_name,
        model_provider: model.model_provider ?? null,
      })),
    })
  } catch (error) {
    console.error('[Admin Compar:IA Reconcile]', error)
    const message = error instanceof Error ? error.message : 'Lecture Compar:IA impossible'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    console.error('[Admin Compar:IA Reconcile]', error)
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }
  const payload = body as {
    sourceId?: unknown
    action?: unknown
    maydaiModelId?: unknown
    links?: unknown
    sourceIds?: unknown
  }
  if (payload.action === 'match-many' || payload.action === 'ignore-many') {
    return bulkReconcile(payload.action, payload)
  }
  if (typeof payload.sourceId !== 'string' || !isAction(payload.action)) {
    return NextResponse.json({ error: 'Action de rapprochement invalide.' }, { status: 400 })
  }
  if (payload.maydaiModelId != null && typeof payload.maydaiModelId !== 'string') {
    return NextResponse.json({ error: 'Modèle MaydAI invalide.' }, { status: 400 })
  }

  try {
    const result = await updateCompariaLink(createEcoLogitsServiceClient(), {
      sourceId: payload.sourceId,
      action: payload.action,
      maydaiModelId: payload.maydaiModelId ?? null,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[Admin Compar:IA Reconcile]', error)
    if (error instanceof CompariaLinkUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function bulkReconcile(
  action: 'match-many' | 'ignore-many',
  payload: { links?: unknown; sourceIds?: unknown },
) {
  const jobs: Array<{ sourceId: string; maydaiModelId: string | null; linkAction: CompariaLinkAction }> = []
  if (action === 'match-many') {
    if (!Array.isArray(payload.links) || payload.links.length === 0) {
      return NextResponse.json({ error: 'Aucune association à enregistrer.' }, { status: 400 })
    }
    for (const link of payload.links) {
      if (!link || typeof link !== 'object') {
        return NextResponse.json({ error: 'Association invalide.' }, { status: 400 })
      }
      const pair = link as { sourceId?: unknown; maydaiModelId?: unknown }
      if (typeof pair.sourceId !== 'string' || typeof pair.maydaiModelId !== 'string' || !pair.maydaiModelId.trim()) {
        return NextResponse.json({ error: 'Association invalide.' }, { status: 400 })
      }
      jobs.push({ sourceId: pair.sourceId, maydaiModelId: pair.maydaiModelId, linkAction: 'match' })
    }
  } else {
    if (!Array.isArray(payload.sourceIds) || payload.sourceIds.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne à ignorer.' }, { status: 400 })
    }
    for (const sourceId of payload.sourceIds) {
      if (typeof sourceId !== 'string' || !sourceId.trim()) {
        return NextResponse.json({ error: 'Identifiant Compar:IA invalide.' }, { status: 400 })
      }
      jobs.push({ sourceId, maydaiModelId: null, linkAction: 'ignore' })
    }
  }

  const supabase = createEcoLogitsServiceClient()
  const errors: string[] = []
  let updated = 0
  for (const job of jobs) {
    try {
      await updateCompariaLink(supabase, {
        sourceId: job.sourceId,
        action: job.linkAction,
        maydaiModelId: job.maydaiModelId,
      })
      updated += 1
    } catch (error) {
      console.error('[Admin Compar:IA Reconcile]', error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      errors.push(`${job.sourceId} : ${message}`)
    }
  }
  if (updated === 0) {
    return NextResponse.json({ error: errors[0] ?? 'Aucune ligne mise à jour.', errors }, { status: 400 })
  }
  return NextResponse.json({
    success: true,
    updated,
    failed: errors.length,
    errors,
  })
}
