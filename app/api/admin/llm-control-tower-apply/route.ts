import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  buildChangedControlTowerUpdate,
  controlTowerDatabasePatch,
  planControlTowerApply,
  projectSelectorAfterApply,
  type ControlTowerModelRef,
  type ControlTowerStoredRow,
  type SelectorModelState,
} from '@/lib/bench-llm/control-tower-apply'
import { requireControlTowerGroup } from '@/lib/bench-llm/control-tower-headers'
import {
  readControlTowerSheetMatrix,
  writeControlTowerCells,
  writeControlTowerTaxonomyStatuses,
} from '@/lib/bench-llm/control-tower-csv'
import { sheetDriveCellsToCopy } from '@/lib/bench-llm/model-lineage'
import { reassignMergedModel } from '@/lib/bench-llm/model-fusion'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} est requis`)
  return value
}

function createServiceClient(): SupabaseClient {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function supabaseFailure(error: { message?: string | null; details?: string | null }): Error {
  const message = typeof error.message === 'string' && error.message.trim() ? error.message.trim() : null
  const details = typeof error.details === 'string' && error.details.trim() ? error.details.trim() : null
  return new Error(message || details || 'Erreur Supabase')
}

function storedRow(value: unknown): ControlTowerStoredRow {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new Error('Ligne compl_ai_models illisible')
  }
  return {
    lifecycle_status: nullableString(value.lifecycle_status),
    launch_date: nullableString(value.launch_date),
    deprecation_date: nullableString(value.deprecation_date),
    retirement_date: nullableString(value.retirement_date),
    replacement_model_id: nullableString(value.replacement_model_id),
    lifecycle_source_url: nullableString(value.lifecycle_source_url),
    lifecycle_checked_at: nullableString(value.lifecycle_checked_at),
    role: nullableString(value.role),
    reference_model_id: nullableString(value.reference_model_id),
    merged_into_id: nullableString(value.merged_into_id),
    base_model_id: nullableString(value.base_model_id),
    license_class: nullableString(value.license_class),
    license_id: nullableString(value.license_id),
    license_url: nullableString(value.license_url),
    license_eu_restricted: nullableBoolean(value.license_eu_restricted),
  }
}

function parisToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const APPLY_MODEL_COLUMNS = [
  'id',
  'slug',
  'model_name',
  'merged_into_id',
  'role',
  'reference_model_id',
  'base_model_id',
  'model_provider_id',
  'lifecycle_status',
  'launch_date',
  'deprecation_date',
  'retirement_date',
  'replacement_model_id',
  'lifecycle_source_url',
  'lifecycle_checked_at',
  'visibility_override',
  'license_class',
  'license_id',
  'license_url',
  'license_eu_restricted',
].join(', ')

async function loadApplyModels(supabase: SupabaseClient): Promise<{
  refs: ControlTowerModelRef[]
  selectorModels: SelectorModelState[]
  storedById: Map<string, ControlTowerStoredRow>
}> {
  const { data: providers, error: providerError } = await supabase
    .from('model_providers')
    .select('id, tooltip_title')
  if (providerError) throw supabaseFailure(providerError)
  const questionnaireProviderIds = new Set(
    (providers ?? [])
      .filter((provider) => provider.tooltip_title != null)
      .map((provider) => provider.id),
  )

  const refs: ControlTowerModelRef[] = []
  const selectorModels: SelectorModelState[] = []
  const storedById = new Map<string, ControlTowerStoredRow>()
  const pageSize = 1000
  let from = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .select(APPLY_MODEL_COLUMNS)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw supabaseFailure(error)
    const rows = data ?? []
    for (const row of rows) {
      if (!isRecord(row) || typeof row.id !== 'string' || typeof row.slug !== 'string') {
        throw new Error('Ligne compl_ai_models illisible')
      }
      storedById.set(row.id, storedRow(row))
      const mergedIntoId = nullableString(row.merged_into_id)
      const role = nullableString(row.role)
      refs.push({
        id: row.id,
        slug: row.slug,
        modelName: nullableString(row.model_name) ?? '',
        mergedIntoId,
        role,
        referenceModelId: nullableString(row.reference_model_id),
      })
      selectorModels.push({
        id: row.id,
        providerInQuestionnaire: typeof row.model_provider_id === 'number'
          && questionnaireProviderIds.has(row.model_provider_id),
        role,
        lifecycleStatus: nullableString(row.lifecycle_status),
        mergedIntoId,
        visibilityOverride: nullableBoolean(row.visibility_override),
        licenseClass: nullableString(row.license_class),
      })
    }
    hasMore = rows.length === pageSize
    from += pageSize
  }
  return { refs, selectorModels, storedById }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  try {
    let dryRun = true
    try {
      const body = await request.json() as { dryRun?: boolean }
      if (body?.dryRun === false) dryRun = false
    } catch (error) {
      console.error('[Control Tower Apply]', error)
      dryRun = true
    }

    const spreadsheetId = getRequiredEnv('GOOGLE_SHEETS_CONTROL_TOWER_ID')
    const supabase = createServiceClient()
    const [matrix, loaded] = await Promise.all([
      readControlTowerSheetMatrix(spreadsheetId),
      loadApplyModels(supabase),
    ])
    const headers = (matrix[0] ?? []).map((header) => String(header ?? ''))
    const plan = planControlTowerApply({
      headers,
      rows: matrix.map((cells, index) => ({ sheetRow: index + 1, cells })),
      models: loaded.refs,
      today: parisToday(),
    })

    const selector = projectSelectorAfterApply(loaded.selectorModels, plan.modifiedRows)

    const nowIso = new Date().toISOString()
    const changedRows = plan.modifiedRows.flatMap((row) => {
      const patch = controlTowerDatabasePatch(row)
      const update = buildChangedControlTowerUpdate(loaded.storedById.get(row.modelId) ?? {}, patch, nowIso)
      return update ? [{ row, update }] : []
    })

    if (!dryRun) {
      for (const { row, update } of changedRows) {
        const { error } = await supabase
          .from('compl_ai_models')
          .update(update)
          .eq('id', row.modelId)
        if (error) throw supabaseFailure(error)
        if (typeof update.merged_into_id === 'string' && update.merged_into_id) {
          const absorberId = update.merged_into_id
          await reassignMergedModel(supabase, row.modelId, absorberId)
          const idIndex = requireControlTowerGroup(headers, 'id')
          const cellId = (cells: string[]) => String(cells[idIndex] ?? '').trim()
          const absorbed = matrix.find((cells) => cellId(cells) === row.modelId) ?? []
          const absorber = matrix.find((cells) => cellId(cells) === absorberId) ?? []
          const copies = sheetDriveCellsToCopy(headers, absorbed, absorber)
          if (copies.length > 0) {
            const absorberIndex = matrix.findIndex((cells) => cellId(cells) === absorberId)
            await writeControlTowerCells(spreadsheetId, copies.map((copy) => ({
              sheetRow: absorberIndex + 1,
              header: copy.header,
              value: copy.value,
            })))
          }
        }
      }
      await writeControlTowerTaxonomyStatuses(
        spreadsheetId,
        plan.modifiedRows
          .filter((row) => row.sheetStatus)
          .map((row) => ({ sheetRow: row.sheetRow, value: row.sheetStatus as string })),
      )
    }

    return NextResponse.json({
      success: true,
      dryRun,
      modifiedRows: changedRows.map((item) => item.row),
      updatedRowCount: changedRows.length,
      rejectedValues: plan.rejectedValues,
      selector,
    })
  } catch (error) {
    console.error('[Control Tower Apply]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
