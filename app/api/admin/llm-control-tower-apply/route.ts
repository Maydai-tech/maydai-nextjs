import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  controlTowerDatabasePatch,
  planControlTowerApply,
  projectSelectorAfterApply,
  type ControlTowerModelRef,
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

function parisToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function loadApplyModels(supabase: SupabaseClient): Promise<{
  refs: ControlTowerModelRef[]
  selectorModels: SelectorModelState[]
}> {
  const { data: providers, error: providerError } = await supabase
    .from('model_providers')
    .select('id, tooltip_title')
  if (providerError) throw new Error(providerError.message)
  const questionnaireProviderIds = new Set(
    (providers ?? [])
      .filter((provider) => provider.tooltip_title != null)
      .map((provider) => provider.id),
  )

  const refs: ControlTowerModelRef[] = []
  const selectorModels: SelectorModelState[] = []
  const pageSize = 1000
  let from = 0
  let hasMore = true
  while (hasMore) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .select('id, slug, model_name, merged_into_id, role, reference_model_id, model_provider_id, lifecycle_status, visibility_override, license_class')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const row of rows) {
      refs.push({
        id: row.id,
        slug: row.slug,
        modelName: row.model_name,
        mergedIntoId: row.merged_into_id,
        role: row.role,
        referenceModelId: row.reference_model_id,
      })
      selectorModels.push({
        id: row.id,
        providerInQuestionnaire: row.model_provider_id != null
          && questionnaireProviderIds.has(row.model_provider_id),
        role: row.role,
        lifecycleStatus: row.lifecycle_status,
        mergedIntoId: row.merged_into_id,
        visibilityOverride: row.visibility_override,
        licenseClass: row.license_class,
      })
    }
    hasMore = rows.length === pageSize
    from += pageSize
  }
  return { refs, selectorModels }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request)
  if (authResult.error) return authResult.error

  try {
    let dryRun = true
    try {
      const body = await request.json() as { dryRun?: boolean }
      if (body?.dryRun === false) dryRun = false
    } catch {
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

    if (!dryRun) {
      for (const row of plan.modifiedRows) {
        const patch = controlTowerDatabasePatch(row)
        if (Object.keys(patch).length === 0) continue
        const { error } = await supabase
          .from('compl_ai_models')
          .update(patch)
          .eq('id', row.modelId)
        if (error) throw new Error(error.message)
        if (row.taxonomie?.merged_into_id) {
          const absorberId = row.taxonomie.merged_into_id
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
      modifiedRows: plan.modifiedRows,
      rejectedValues: plan.rejectedValues,
      selector,
    })
  } catch (error) {
    console.error('[API Admin Apply LLM Control]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
      },
      { status: 500 },
    )
  }
}
