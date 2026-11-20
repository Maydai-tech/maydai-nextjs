/**
 * Pré-classement de la tour de contrôle. Simulation seule : n'écrit ni dans le Sheet ni en base.
 *
 *   pnpm dlx tsx scripts/control-tower-preclassify.ts
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { google } from 'googleapis'
import path from 'node:path'

import { findControlTowerHeader } from '../lib/bench-llm/control-tower-headers'
import {
  preclassReferenceRefusals,
  preclassifyModels,
  type PreclassModel,
  type PreclassProposal,
} from '../lib/bench-llm/control-tower-preclassify'
import { roleFromLegacyLabel, roleFromLineLabels } from '../lib/bench-llm/control-tower-taxonomy'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })

type SheetRow = {
  id: string
  provider: string
  legacyRole: string
  referenceId: string
}

function sheetRows(matrix: string[][]): SheetRow[] {
  const headers = matrix[0] ?? []
  const idIndex = findControlTowerHeader(headers, 'ID Supabase')
  const providerIndex = findControlTowerHeader(headers, 'Nom de la technologie')
  const roleIndex = findControlTowerHeader(headers, 'Rôle', 'Type de ligne')
  const precisionIndex = findControlTowerHeader(headers, 'Précision')
  const referenceIndex = findControlTowerHeader(headers, 'Ligne de référence (ID)')
  return matrix.slice(1).map((row) => {
    const typeValue = roleIndex < 0 ? '' : String(row[roleIndex] ?? '').trim()
    const precision = precisionIndex < 0 ? '' : String(row[precisionIndex] ?? '').trim()
    const legacy = precisionIndex >= 0 && roleIndex >= 0 && headers[roleIndex]?.includes('Type')
      ? roleFromLineLabels(typeValue, precision)
      : roleFromLegacyLabel(typeValue)
    return {
      id: idIndex < 0 ? '' : String(row[idIndex] ?? '').trim(),
      provider: providerIndex < 0 ? '' : String(row[providerIndex] ?? '').trim(),
      legacyRole: legacy === 'invalid' ? typeValue : (legacy ?? ''),
      referenceId: referenceIndex < 0 ? '' : String(row[referenceIndex] ?? '').trim(),
    }
  }).filter((row) => row.id.length > 0)
}

function proposalRole(proposal: PreclassProposal): string {
  const role = roleFromLineLabels(proposal.lineType, proposal.precision)
  return role === 'invalid' ? '' : (role ?? '')
}

async function loadModels(): Promise<PreclassModel[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
  const models = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('compl_ai_models')
      .select('id, model_name, model_provider, created_at, slug')
      .range(from, from + 999)
    if (error) throw error
    models.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const cards = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('llm_system_cards').select('model_identifier').range(from, from + 999)
    if (error) throw error
    for (const row of data ?? []) cards.add(row.model_identifier)
    if (!data || data.length < 1000) break
  }
  const usecases = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('usecases')
      .select('primary_model_id')
      .not('primary_model_id', 'is', null)
      .is('soft_deleted_at', null)
      .range(from, from + 999)
    if (error) throw error
    for (const row of data ?? []) {
      usecases.set(row.primary_model_id, (usecases.get(row.primary_model_id) ?? 0) + 1)
    }
    if (!data || data.length < 1000) break
  }
  const slugById = new Map(models.map((model) => [model.id, model.slug]))
  return models.map((model) => ({
    id: model.id,
    provider: model.model_provider ?? '',
    modelName: model.model_name ?? '',
    createdAt: model.created_at ?? '',
    hasCard: cards.has(slugById.get(model.id) ?? ''),
    usecases: usecases.get(model.id) ?? 0,
  }))
}

async function loadSheet(): Promise<string[][]> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID?.trim()
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_CONTROL_TOWER_ID est requis')
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(title,index)',
  })
  const title = [...(meta.data.sheets ?? [])].sort(
    (left, right) => (left.properties?.index ?? 0) - (right.properties?.index ?? 0),
  )[0]?.properties?.title
  if (!title) throw new Error('Aucun onglet')
  const values = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title.replace(/'/g, "''")}'`,
  })
  return (values.data.values ?? []).map((row) => row.map((cell) => String(cell ?? '')))
}

function printReport(proposals: PreclassProposal[], current: SheetRow[]): void {
  const byType = new Map<string, number>()
  const byProvider = new Map<string, Map<string, number>>()
  for (const proposal of proposals) {
    const type = proposal.lineType || '(sans type)'
    byType.set(type, (byType.get(type) ?? 0) + 1)
    const providerCounts = byProvider.get(proposal.provider) ?? new Map<string, number>()
    providerCounts.set(type, (providerCounts.get(type) ?? 0) + 1)
    byProvider.set(proposal.provider, providerCounts)
  }
  console.log('Simulation, aucune écriture.')
  console.log('Par type :')
  for (const [type, count] of [...byType.entries()].sort((left, right) => right[1] - left[1])) {
    console.log(`  ${type}: ${count}`)
  }
  console.log('Par éditeur :')
  for (const [provider, counts] of [...byProvider.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const parts = [...counts.entries()].map(([type, count]) => `${type} ${count}`).join(', ')
    console.log(`  ${provider}: ${parts}`)
  }
  const currentById = new Map(current.map((row) => [row.id, row]))
  const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]))
  let roleDiffs = 0
  let referenceDiffs = 0
  const examples: string[] = []
  for (const proposal of proposals) {
    const sheet = currentById.get(proposal.id)
    if (!sheet) continue
    const nextRole = proposalRole(proposal)
    const nextReference = proposal.referenceId ?? ''
    if ((sheet.legacyRole || '') !== nextRole) roleDiffs += 1
    if (sheet.referenceId !== nextReference) referenceDiffs += 1
    if (examples.length < 12 && ((sheet.legacyRole || '') !== nextRole || sheet.referenceId !== nextReference)) {
      examples.push(
        `${proposal.modelName} | rôle ${sheet.legacyRole || '∅'} → ${nextRole || '∅'} | référence ${sheet.referenceId || '∅'} → ${nextReference || '∅'}`,
      )
    }
  }
  console.log(`Différences de rôle : ${roleDiffs}`)
  console.log(`Différences de ligne de référence : ${referenceDiffs}`)
  for (const example of examples) console.log(`  ${example}`)
  const refusals = preclassReferenceRefusals([...proposalById.values()])
  console.log(`Références refusées par les règles 2.5 : ${refusals.length}`)
  for (const refusal of refusals.slice(0, 10)) {
    console.log(`  ${refusal.modelName}: ${refusal.reason}`)
  }
  const watched = proposals.filter((proposal) => /gpt oss|qwen2\.5 (32b|72b)/i.test(proposal.modelName))
  console.log('Familles contrôlées :')
  for (const proposal of watched) {
    const sheet = currentById.get(proposal.id)
    console.log(
      `  ${proposal.modelName} | ${proposal.lineType || 'sans type'} ${proposal.precision} | référence ${sheet?.referenceId || '∅'} → ${proposal.referenceId || '∅'}`,
    )
  }
  const unclassified = proposals.filter((proposal) => proposal.action === 'CLASSER')
  console.log(`Sans type, CLASSER : ${unclassified.length}`)
  for (const proposal of unclassified) {
    console.log(`  ${proposal.provider} — ${proposal.modelName}`)
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--write')) {
    throw new Error('Ce script est une simulation. Il n\'écrit ni dans le Sheet ni en base.')
  }
  const [models, matrix] = await Promise.all([loadModels(), loadSheet()])
  printReport(preclassifyModels(models), sheetRows(matrix))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
