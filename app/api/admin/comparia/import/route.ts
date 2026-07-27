import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { findExactCompariaLinks, parseCompariaCsv } from '@/lib/comparia/import'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const startedAt = Date.now()
  const supabase = createEcoLogitsServiceClient()
  let runId: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier CSV Compar:IA manquant.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Le fichier doit être au format CSV.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Le fichier CSV dépasse la limite de 5 Mo.' }, { status: 413 })
    }

    const rows = parseCompariaCsv(await file.text())
    const { data: run, error: runError } = await supabase
      .from('comparia_import_runs')
      .insert({
        status: 'running',
        file_name: file.name,
        rows_received: rows.length,
      })
      .select('id')
      .single()
    if (runError) throw runError
    runId = run.id

    const [{ data: canonicalModels, error: canonicalError }, { data: existingRows, error: existingError }] =
      await Promise.all([
        supabase
          .from('compl_ai_models')
          .select('id, model_name, model_provider, llm_stats_id'),
        supabase
          .from('comparia_models')
          .select('id, source_id, maydai_model_id, match_method, is_active'),
      ])
    if (canonicalError) throw canonicalError
    if (existingError) throw existingError

    const exactLinks = findExactCompariaLinks(rows, canonicalModels ?? [])
    const manuallyLinkedMaydaiIds = new Set(
      (existingRows ?? [])
        .filter((row) => row.match_method === 'manual' && row.maydai_model_id)
        .map((row) => row.maydai_model_id),
    )
    for (const [sourceId, maydaiId] of exactLinks) {
      if (manuallyLinkedMaydaiIds.has(maydaiId)) exactLinks.delete(sourceId)
    }
    const sourceIdsByMaydai = new Map<string, string[]>()
    for (const [sourceId, maydaiId] of exactLinks) {
      sourceIdsByMaydai.set(maydaiId, [...(sourceIdsByMaydai.get(maydaiId) ?? []), sourceId])
    }
    for (const sourceIds of sourceIdsByMaydai.values()) {
      if (sourceIds.length > 1) sourceIds.forEach((sourceId) => exactLinks.delete(sourceId))
    }

    const existingBySource = new Map((existingRows ?? []).map((row) => [row.source_id, row]))
    const importedAt = new Date().toISOString()
    const payload = rows.map((row) => {
      const existing = existingBySource.get(row.source_id)
      const keepsManualLink = existing?.match_method === 'manual' && existing.maydai_model_id
      const exactModelId = exactLinks.get(row.source_id) ?? null
      return {
        ...row,
        maydai_model_id: keepsManualLink ? existing.maydai_model_id : exactModelId,
        match_method: keepsManualLink ? 'manual' : exactModelId ? 'exact' : null,
        is_active: true,
        last_imported_at: importedAt,
        missing_since: null,
        updated_at: importedAt,
      }
    })

    const { error: upsertError } = await supabase
      .from('comparia_models')
      .upsert(payload, { onConflict: 'source_id' })
    if (upsertError) throw upsertError

    const importedSourceIds = new Set(rows.map((row) => row.source_id))
    const missingIds = (existingRows ?? [])
      .filter((row) => row.is_active && !importedSourceIds.has(row.source_id))
      .map((row) => row.id)
    if (missingIds.length > 0) {
      const { error: deactivateError } = await supabase
        .from('comparia_models')
        .update({ is_active: false, missing_since: importedAt, updated_at: importedAt })
        .in('id', missingIds)
      if (deactivateError) throw deactivateError
    }

    const ranksByMaydai = payload
      .filter((row) => row.maydai_model_id)
      .map((row) => ({ id: row.maydai_model_id!, rank: row.rank }))
    const rankUpdates = await Promise.all(
      ranksByMaydai.map(({ id, rank }) =>
        supabase.from('compl_ai_models').update({ comparia_rank: rank }).eq('id', id),
      ),
    )
    const rankError = rankUpdates.find((result) => result.error)?.error
    if (rankError) throw rankError

    const exactLinksCreated = payload.filter((row) => {
      const existing = existingBySource.get(row.source_id)
      return row.match_method === 'exact' &&
        (existing?.match_method !== 'exact' || existing.maydai_model_id !== row.maydai_model_id)
    }).length
    await supabase
      .from('comparia_import_runs')
      .update({
        status: 'success',
        rows_imported: rows.length,
        exact_links_created: exactLinksCreated,
        models_deactivated: missingIds.length,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      })
      .eq('id', runId)

    return NextResponse.json({
      success: true,
      rowsImported: rows.length,
      exactLinksCreated,
      modelsDeactivated: missingIds.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    if (runId) {
      await supabase
        .from('comparia_import_runs')
        .update({
          status: 'error',
          errors: [message],
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        })
        .eq('id', runId)
    }
    console.error('[Compar:IA] Import impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
