import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { CompariaLinkUpdateError, updateCompariaLink, type CompariaLinkAction } from '@/lib/comparia/link-actions'
import type { CompariaLinkStatus } from '@/lib/comparia/matching'
import { suggestMaydaiModelForComparia, type MaydaiSuggestionModel } from '@/lib/comparia/suggestions'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STATUSES = ['unmatched', 'ignored', 'matched', 'all'] as const
type StatusFilter = (typeof STATUSES)[number]

type CompariaQueueRow = {
  source_id: string
  rank: number
  organisation: string | null
  bradley_terry_score: number | null
  license: string | null
  size: string | null
  release_date: string | null
  link_status: CompariaLinkStatus | null
  maydai_model_id: string | null
  is_active: boolean
}

type MaydaiOption = {
  id: string
  slug: string | null
  model_name: string
  model_provider: string | null
  short_name?: string | null
  long_name?: string | null
  variants?: unknown
  merged_into_id?: string | null
}

function readVariants(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

function toSuggestionModel(model: MaydaiOption): MaydaiSuggestionModel {
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

function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUSES.some((status) => status === value)
}

function isAction(value: unknown): value is CompariaLinkAction {
  return value === 'match' || value === 'ignore' || value === 'unignore'
}

function visibleRow(row: CompariaQueueRow, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (row.link_status !== status) return false
  if (status === 'ignored') return true
  return row.is_active
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const requested = request.nextUrl.searchParams.get('status')
  const status: StatusFilter = isStatusFilter(requested) ? requested : 'unmatched'
  const supabase = createEcoLogitsServiceClient()

  const [{ data: rows, error: rowsError }, { data: models, error: modelsError }] = await Promise.all([
    supabase
      .from('comparia_models')
      .select('source_id, rank, organisation, bradley_terry_score, license, size, release_date, link_status, maydai_model_id, is_active')
      .order('rank', { ascending: true }),
    supabase
      .from('compl_ai_models')
      .select('id, slug, model_name, model_provider, short_name, long_name, variants, merged_into_id')
      .order('model_provider', { ascending: true })
      .order('model_name', { ascending: true }),
  ])
  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 })
  }
  if (modelsError) {
    return NextResponse.json({ error: modelsError.message }, { status: 500 })
  }

  const catalog = (rows ?? []) as CompariaQueueRow[]
  const suggestionModels = ((models ?? []) as MaydaiOption[]).map(toSuggestionModel)
  const counts = {
    unmatched: catalog.filter((row) => row.link_status === 'unmatched' && row.is_active).length,
    ignored: catalog.filter((row) => row.link_status === 'ignored').length,
    matched: catalog.filter((row) => row.link_status === 'matched' && row.is_active).length,
  }

  return NextResponse.json({
    status,
    counts,
    rows: catalog.filter((row) => visibleRow(row, status)).map((row) => ({
      ...row,
      suggestionId: row.link_status === 'unmatched' && row.is_active
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
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
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
    if (error instanceof CompariaLinkUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Rapprochement impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
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
