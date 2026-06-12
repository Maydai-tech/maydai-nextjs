/**
 * Utility for syncing todo action completions with questionnaire responses
 *
 * When a dossier document is uploaded (e.g., technical_documentation),
 * this utility updates the corresponding questionnaire response and
 * recalculates the use case score.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'
import { resolveCanonicalDocType } from '@/lib/canonical-actions'
import { mergeChecklistIntoDbResponseRows } from '@/lib/merge-checklist-into-user-responses'

function isE4E5E6QuestionCode(code: string): boolean {
  return code.startsWith('E4.') || code.startsWith('E5.') || code.startsWith('E6.')
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function optionCodeChecklistField(optionCode: string): 'checklist_gov_enterprise' | 'checklist_gov_usecase' {
  return optionCode.startsWith('E5.') ? 'checklist_gov_enterprise' : 'checklist_gov_usecase'
}

function replaceMappingOptionInChecklists(
  checklistEnt: string[],
  checklistUc: string[],
  mapping: TodoActionMapping,
  newOptionCode: string
): { checklist_gov_enterprise: string[]; checklist_gov_usecase: string[] } {
  const strip = new Set(
    [mapping.negativeAnswerCode, mapping.positiveAnswerCode].filter(
      (c): c is string => typeof c === 'string' && c.length > 0
    )
  )
  let ent = checklistEnt.filter((c) => !strip.has(c))
  let uc = checklistUc.filter((c) => !strip.has(c))
  const field = optionCodeChecklistField(newOptionCode)
  if (field === 'checklist_gov_enterprise') {
    ent = [...ent, newOptionCode]
  } else {
    uc = [...uc, newOptionCode]
  }
  return { checklist_gov_enterprise: ent, checklist_gov_usecase: uc }
}

export type DbResponseRow = {
  question_code: string
  single_value?: string | null
  multiple_codes?: string[] | null
  multiple_labels?: string[] | null
  conditional_main?: string | null
  conditional_keys?: string[] | null
  conditional_values?: string[] | null
  metadata?: Record<string, unknown> | null
}

function extractOriginalValueFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).original_value
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function loadResponseOriginalValueByCode(
  supabase: SupabaseClient,
  usecaseId: string,
  questionCodes: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (questionCodes.length === 0) return map

  const { data } = await supabase
    .from('usecase_responses')
    .select('question_code, metadata')
    .eq('usecase_id', usecaseId)
    .in('question_code', questionCodes)

  for (const row of data ?? []) {
    map.set(row.question_code, extractOriginalValueFromMetadata(row.metadata))
  }
  return map
}

function buildSyncMetadataPayload(
  existingMetadata: unknown,
  previousValue: string | null,
  negativeAnswerCode: string | null
): { original_value: string | null } {
  const existingOriginal = extractOriginalValueFromMetadata(existingMetadata)
  if (existingOriginal) {
    return { original_value: existingOriginal }
  }
  if (previousValue) {
    return { original_value: previousValue }
  }
  return { original_value: negativeAnswerCode }
}

export function extractEffectiveSingleValue(row: DbResponseRow): string | null {
  if (typeof row.single_value === 'string' && row.single_value.length > 0) {
    return row.single_value
  }
  if (typeof row.conditional_main === 'string' && row.conditional_main.length > 0) {
    return row.conditional_main
  }
  if (Array.isArray(row.multiple_codes) && row.multiple_codes.length > 0) {
    const first = row.multiple_codes[0]
    return typeof first === 'string' && first.length > 0 ? first : null
  }
  return null
}

/**
 * Valeurs effectives par question : `usecase_responses` fusionnées avec `checklist_gov_*`
 * (même logique que calculate-score).
 */
export async function loadMergedPreviousByCode(
  supabase: SupabaseClient,
  usecaseId: string,
  questionCodes: string[]
): Promise<{
  previousByCode: Map<string, string | null>
  checklistEnt: string[]
  checklistUc: string[]
}> {
  const [{ data: usecaseRow }, { data: existingRows }] = await Promise.all([
    supabase
      .from('usecases')
      .select('checklist_gov_enterprise, checklist_gov_usecase')
      .eq('id', usecaseId)
      .single(),
    supabase
      .from('usecase_responses')
      .select(
        'question_code, single_value, multiple_codes, multiple_labels, conditional_main, conditional_keys, conditional_values'
      )
      .eq('usecase_id', usecaseId)
      .in('question_code', questionCodes),
  ])

  const checklistEnt = normalizeStringArray(usecaseRow?.checklist_gov_enterprise)
  const checklistUc = normalizeStringArray(usecaseRow?.checklist_gov_usecase)

  const merged = mergeChecklistIntoDbResponseRows(
    (existingRows ?? []) as DbResponseRow[],
    checklistEnt.length > 0 ? checklistEnt : null,
    checklistUc.length > 0 ? checklistUc : null
  )

  const previousByCode = new Map<string, string | null>()
  for (const code of questionCodes) {
    previousByCode.set(code, null)
  }
  for (const row of merged) {
    if (!row.question_code) continue
    previousByCode.set(row.question_code, extractEffectiveSingleValue(row))
  }

  return { previousByCode, checklistEnt, checklistUc }
}

async function persistChecklistsIfChanged(
  supabase: SupabaseClient,
  usecaseId: string,
  initialEnt: string[],
  initialUc: string[],
  nextEnt: string[],
  nextUc: string[]
): Promise<void> {
  const signature = (arr: string[]) => [...arr].sort().join('|')
  const entChanged = signature(nextEnt) !== signature(initialEnt)
  const ucChanged = signature(nextUc) !== signature(initialUc)
  if (!entChanged && !ucChanged) return

  const { error } = await supabase
    .from('usecases')
    .update({
      checklist_gov_enterprise: nextEnt,
      checklist_gov_usecase: nextUc,
      updated_at: new Date().toISOString(),
    })
    .eq('id', usecaseId)

  if (error) {
    console.error('[TODO-SYNC] Error updating checklist_gov_*:', error)
  }
}

export interface TodoActionMapping {
  questionCode: string
  positiveAnswerCode: string
  negativeAnswerCode: string | null
  expectedPointsGained: number
  reason: string
}

function buildTodoActionMappingForQuestion(
  questionCode: string,
  questionObj: Record<string, unknown>,
  canonicalTodo: string
): TodoActionMapping | null {
  if (questionObj.todo_action !== canonicalTodo) return null
  const options = questionObj.options as Array<{ code?: string; score_impact?: number }> | undefined
  if (!options?.length) return null

  let positiveAnswerCode: string | null = null
  let negativeAnswerCode: string | null = null
  let positiveImpact = 0
  let negativeImpact = 0

  for (const option of options) {
    const impact = option.score_impact ?? 0

    if (impact < 0) {
      negativeAnswerCode = option.code ?? null
      negativeImpact = impact
    } else if (impact === 0 && !positiveAnswerCode) {
      positiveAnswerCode = option.code ?? null
      positiveImpact = impact
    }
  }

  if (!positiveAnswerCode) {
    for (const option of options) {
      const impact = option.score_impact ?? 0
      if (impact >= 0) {
        positiveAnswerCode = option.code ?? null
        positiveImpact = impact
        break
      }
    }
  }

  if (!positiveAnswerCode) {
    console.warn(`[TODO-SYNC] No positive answer found for question ${questionCode}`)
    return null
  }

  const expectedPointsGained = positiveImpact - negativeImpact

  return {
    questionCode,
    positiveAnswerCode,
    negativeAnswerCode,
    expectedPointsGained,
    reason: getReasonForTodoAction(canonicalTodo),
  }
}

/**
 * Toutes les questions du JSON portant le même `todo_action` canonique (N → 1 dossier).
 * Ordre = ordre d’itération des clés dans `questions-with-scores.json`.
 */
export function getTodoActionMappings(todoAction: string): TodoActionMapping[] {
  const canonicalTodo = resolveCanonicalDocType(todoAction)
  const out: TodoActionMapping[] = []
  for (const [questionCode, question] of Object.entries(questionsData)) {
    const m = buildTodoActionMappingForQuestion(questionCode, question as Record<string, unknown>, canonicalTodo)
    if (m) out.push(m)
  }
  return out
}

/**
 * Rétrocompatibilité (sync upload dossier, etc.) : première question matchant le `todo_action`.
 * @see getTodoActionMappings pour le périmètre complet.
 */
export function getTodoActionMapping(todoAction: string): TodoActionMapping | null {
  const mappings = getTodoActionMappings(todoAction)
  return mappings[0] ?? null
}

/**
 * Returns a human-readable reason for why the score changed (increase)
 */
function getReasonForTodoAction(todoAction: string): string {
  const reasons: Record<string, string> = {
    technical_documentation: 'Documentation technique ajoutee',
    transparency_marking: 'Marquage de transparence ajoute',
    continuous_monitoring: 'Surveillance continue mise en place',
    risk_management: 'Systeme de gestion des risques etabli',
    data_quality: 'Procedures qualite des donnees ajoutees',
    registry_proof: 'Preuve de registre ajoutee',
    registry_action: 'Preuve de registre ajoutee',
    human_oversight: 'Surveillance humaine mise en place',
    training_plan: 'Formations AI Act documentees',
    system_prompt: 'Instructions systeme et garde-fous documentes',
  }
  return reasons[todoAction] || 'Document de conformite ajoute'
}

/**
 * Returns a human-readable reason for why the score decreased (reset)
 */
function getReasonForTodoActionReset(todoAction: string): string {
  const reasons: Record<string, string> = {
    technical_documentation: 'Documentation technique reintialisee',
    transparency_marking: 'Marquage de transparence reinitialise',
    continuous_monitoring: 'Surveillance continue reintialisee',
    risk_management: 'Systeme de gestion des risques reinitialise',
    data_quality: 'Procedures qualite des donnees reintialisees',
    registry_proof: 'Preuve de registre reintialisee',
    registry_action: 'Preuve de registre reintialisee',
    human_oversight: 'Surveillance humaine reintialisee',
    training_plan: 'Formations AI Act reintialisees',
    system_prompt: 'Instructions systeme et garde-fous reinitialises',
  }
  return reasons[todoAction] || 'Document de conformite reinitialise'
}

type SyncOneMappingResult = {
  changed: boolean
  shouldRecalculate: boolean
  previousValue: string | null
  expectedPointsGained: number
}

async function syncOneTodoMappingToResponse(
  supabase: SupabaseClient,
  usecaseId: string,
  mapping: TodoActionMapping,
  userEmail: string,
  previousValue: string | null,
  skipChecklistUpdate = false
): Promise<SyncOneMappingResult> {
  if (previousValue === mapping.positiveAnswerCode) {
    console.log(
      `[TODO-SYNC] ${mapping.questionCode} already set to positive value, no change needed`
    )
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsGained: 0 }
  }

  const wasNegativeAnswer = previousValue === mapping.negativeAnswerCode

  console.log(
    `[TODO-SYNC] Updating ${mapping.questionCode} from ${previousValue} to ${mapping.positiveAnswerCode}`
  )
  console.log(
    `[TODO-SYNC] Was negative answer: ${wasNegativeAnswer}, Expected points: ${wasNegativeAnswer ? mapping.expectedPointsGained : 0}`
  )

  if (isE4E5E6QuestionCode(mapping.questionCode) && !skipChecklistUpdate) {
    const { data: ucRow } = await supabase
      .from('usecases')
      .select('checklist_gov_enterprise, checklist_gov_usecase')
      .eq('id', usecaseId)
      .single()
    const ent = normalizeStringArray(ucRow?.checklist_gov_enterprise)
    const uc = normalizeStringArray(ucRow?.checklist_gov_usecase)
    const next = replaceMappingOptionInChecklists(ent, uc, mapping, mapping.positiveAnswerCode)
    await persistChecklistsIfChanged(supabase, usecaseId, ent, uc, next.checklist_gov_enterprise, next.checklist_gov_usecase)
  }

  const { data: existingRow } = await supabase
    .from('usecase_responses')
    .select('metadata')
    .eq('usecase_id', usecaseId)
    .eq('question_code', mapping.questionCode)
    .maybeSingle()

  const metadata = buildSyncMetadataPayload(
    existingRow?.metadata,
    previousValue,
    mapping.negativeAnswerCode
  )

  const { error } = await supabase.from('usecase_responses').upsert(
    {
      usecase_id: usecaseId,
      question_code: mapping.questionCode,
      single_value: mapping.positiveAnswerCode,
      answered_by: userEmail,
      answered_at: new Date().toISOString(),
      multiple_codes: null,
      multiple_labels: null,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null,
      metadata,
    },
    { onConflict: 'usecase_id,question_code' }
  )

  if (error) {
    console.error(`[TODO-SYNC] Error updating response for ${mapping.questionCode}:`, error)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsGained: 0 }
  }

  console.log(`[TODO-SYNC] Response updated successfully for ${mapping.questionCode}`)

  return {
    changed: true,
    shouldRecalculate: wasNegativeAnswer,
    previousValue,
    expectedPointsGained: wasNegativeAnswer ? mapping.expectedPointsGained : 0,
  }
}

/**
 * Updates the questionnaire response for the given todo_action
 * Returns info about whether the response changed and if score should be recalculated
 *
 * Score should only be recalculated when:
 * - Previous value was the NEGATIVE answer (e.g., "Non" with -10 score_impact)
 * - In this case, changing to positive gives +10 points
 *
 * Score should NOT be recalculated when:
 * - Previous value was null (no answer) - delta is 0
 * - Previous value was already positive - no change
 *
 * Plusieurs questions peuvent partager le même `todo_action` : toutes sont mises à jour en parallèle.
 */
export async function syncTodoActionToResponse(
  supabase: SupabaseClient,
  usecaseId: string,
  todoAction: string,
  userEmail: string
): Promise<{
  changed: boolean
  shouldRecalculate: boolean
  previousValue: string | null
  expectedPointsGained: number
}> {
  const mappings = getTodoActionMappings(todoAction)
  if (mappings.length === 0) {
    console.log(`[TODO-SYNC] No mapping found for todo_action: ${todoAction}`)
    return { changed: false, shouldRecalculate: false, previousValue: null, expectedPointsGained: 0 }
  }

  console.log(`[TODO-SYNC] Found ${mappings.length} mapping(s) for ${todoAction}:`, mappings)

  const codes = mappings.map((m) => m.questionCode)
  const { previousByCode, checklistEnt, checklistUc } = await loadMergedPreviousByCode(
    supabase,
    usecaseId,
    codes
  )

  let nextEnt = [...checklistEnt]
  let nextUc = [...checklistUc]
  for (const m of mappings) {
    const prev = previousByCode.get(m.questionCode) ?? null
    if (prev === m.positiveAnswerCode) continue
    if (!isE4E5E6QuestionCode(m.questionCode)) continue
    const next = replaceMappingOptionInChecklists(nextEnt, nextUc, m, m.positiveAnswerCode)
    nextEnt = next.checklist_gov_enterprise
    nextUc = next.checklist_gov_usecase
  }
  await persistChecklistsIfChanged(supabase, usecaseId, checklistEnt, checklistUc, nextEnt, nextUc)

  const perMapping = await Promise.all(
    mappings.map((m) =>
      syncOneTodoMappingToResponse(
        supabase,
        usecaseId,
        m,
        userEmail,
        previousByCode.get(m.questionCode) ?? null,
        true
      )
    )
  )

  let expectedPointsGained = 0
  let anyChanged = false
  let firstPrevious: string | null = null
  for (let i = 0; i < perMapping.length; i++) {
    const r = perMapping[i]!
    if (i === 0) firstPrevious = r.previousValue
    if (r.changed) anyChanged = true
    expectedPointsGained += r.expectedPointsGained
  }

  return {
    changed: anyChanged,
    /** Aligné sur les routes API : recalcul uniquement si le cumul des gains de base est strictement positif. */
    shouldRecalculate: expectedPointsGained > 0,
    previousValue: firstPrevious,
    expectedPointsGained,
  }
}

type ReverseOneMappingResult = {
  changed: boolean
  shouldRecalculate: boolean
  previousValue: string | null
  expectedPointsLost: number
}

async function reverseOneTodoMappingResponse(
  supabase: SupabaseClient,
  usecaseId: string,
  mapping: TodoActionMapping,
  userEmail: string,
  previousValue: string | null,
  skipChecklistUpdate = false
): Promise<ReverseOneMappingResult> {
  if (!mapping.negativeAnswerCode) {
    console.log(`[TODO-REVERSE] No negative answer code for ${mapping.questionCode}, skip`)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsLost: 0 }
  }

  if (previousValue === mapping.negativeAnswerCode) {
    console.log(`[TODO-REVERSE] ${mapping.questionCode} already set to negative value, no change needed`)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsLost: 0 }
  }

  const wasPositiveAnswer = previousValue === mapping.positiveAnswerCode

  const { data: metadataRow } = await supabase
    .from('usecase_responses')
    .select('metadata')
    .eq('usecase_id', usecaseId)
    .eq('question_code', mapping.questionCode)
    .maybeSingle()

  const originalValue = extractOriginalValueFromMetadata(metadataRow?.metadata)
  const restoreValue = originalValue || mapping.negativeAnswerCode

  console.log(
    `[TODO-REVERSE] Updating ${mapping.questionCode} from ${previousValue} to ${restoreValue}`
  )
  console.log(
    `[TODO-REVERSE] Was positive answer: ${wasPositiveAnswer}, Expected points lost: ${wasPositiveAnswer ? mapping.expectedPointsGained : 0}`
  )

  if (isE4E5E6QuestionCode(mapping.questionCode) && mapping.negativeAnswerCode && !skipChecklistUpdate) {
    const { data: ucRow } = await supabase
      .from('usecases')
      .select('checklist_gov_enterprise, checklist_gov_usecase')
      .eq('id', usecaseId)
      .single()
    const ent = normalizeStringArray(ucRow?.checklist_gov_enterprise)
    const uc = normalizeStringArray(ucRow?.checklist_gov_usecase)
    const next = replaceMappingOptionInChecklists(ent, uc, mapping, restoreValue)
    await persistChecklistsIfChanged(supabase, usecaseId, ent, uc, next.checklist_gov_enterprise, next.checklist_gov_usecase)
  }

  const { error } = await supabase.from('usecase_responses').upsert(
    {
      usecase_id: usecaseId,
      question_code: mapping.questionCode,
      single_value: restoreValue,
      answered_by: userEmail,
      answered_at: new Date().toISOString(),
      multiple_codes: null,
      multiple_labels: null,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null,
      metadata: {},
    },
    { onConflict: 'usecase_id,question_code' }
  )

  if (error) {
    console.error(`[TODO-REVERSE] Error updating response for ${mapping.questionCode}:`, error)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsLost: 0 }
  }

  console.log(`[TODO-REVERSE] Response reversed successfully for ${mapping.questionCode}`)

  return {
    changed: true,
    shouldRecalculate: wasPositiveAnswer,
    previousValue,
    expectedPointsLost: wasPositiveAnswer ? mapping.expectedPointsGained : 0,
  }
}

/**
 * Reverses the questionnaire response for the given todo_action
 * Sets the response back to the NEGATIVE answer ("Non") when a document is reset/deleted.
 * Returns info about whether the response changed and how many points should be lost.
 *
 * Score should only decrease when:
 * - Previous value was the POSITIVE answer (e.g., "Oui" with 0 score_impact)
 * - In this case, changing to negative loses points
 *
 * Score should NOT decrease when:
 * - Previous value was null (no answer) - no change
 * - Previous value was already negative - no change
 * - No negative answer exists for this mapping
 *
 * Plusieurs questions peuvent partager le même `todo_action` : chaque ligne réversible est traitée en parallèle.
 */
export async function reverseTodoActionResponse(
  supabase: SupabaseClient,
  usecaseId: string,
  todoAction: string,
  userEmail: string
): Promise<{
  changed: boolean
  shouldRecalculate: boolean
  previousValue: string | null
  expectedPointsLost: number
  reason: string
}> {
  const mappings = getTodoActionMappings(todoAction)
  const reversible = mappings.filter(m => m.negativeAnswerCode)

  if (mappings.length === 0) {
    console.log(`[TODO-REVERSE] No mapping found for todo_action: ${todoAction}`)
    return { changed: false, shouldRecalculate: false, previousValue: null, expectedPointsLost: 0, reason: '' }
  }

  if (reversible.length === 0) {
    console.log(`[TODO-REVERSE] No negative answer code for any question of ${todoAction}, cannot reverse`)
    return { changed: false, shouldRecalculate: false, previousValue: null, expectedPointsLost: 0, reason: '' }
  }

  console.log(`[TODO-REVERSE] Found ${reversible.length} reversible mapping(s) for ${todoAction}:`, reversible)

  const codes = reversible.map((m) => m.questionCode)
  const [{ previousByCode, checklistEnt, checklistUc }, originalByCode] = await Promise.all([
    loadMergedPreviousByCode(supabase, usecaseId, codes),
    loadResponseOriginalValueByCode(supabase, usecaseId, codes),
  ])

  let nextEnt = [...checklistEnt]
  let nextUc = [...checklistUc]
  for (const m of reversible) {
    if (!m.negativeAnswerCode) continue
    const prev = previousByCode.get(m.questionCode) ?? null
    const restoreCode = originalByCode.get(m.questionCode) ?? m.negativeAnswerCode
    if (prev === restoreCode) continue
    if (!isE4E5E6QuestionCode(m.questionCode)) continue
    const next = replaceMappingOptionInChecklists(nextEnt, nextUc, m, restoreCode)
    nextEnt = next.checklist_gov_enterprise
    nextUc = next.checklist_gov_usecase
  }
  await persistChecklistsIfChanged(supabase, usecaseId, checklistEnt, checklistUc, nextEnt, nextUc)

  const perMapping = await Promise.all(
    reversible.map((m) =>
      reverseOneTodoMappingResponse(
        supabase,
        usecaseId,
        m,
        userEmail,
        previousByCode.get(m.questionCode) ?? null,
        true
      )
    )
  )

  let expectedPointsLost = 0
  let anyChanged = false
  let firstPrevious: string | null = null
  for (let i = 0; i < perMapping.length; i++) {
    const r = perMapping[i]!
    if (i === 0) firstPrevious = r.previousValue
    if (r.changed) anyChanged = true
    expectedPointsLost += r.expectedPointsLost
  }

  const reason = getReasonForTodoActionReset(todoAction)

  return {
    changed: anyChanged,
    shouldRecalculate: expectedPointsLost > 0,
    previousValue: firstPrevious,
    expectedPointsLost,
    reason,
  }
}

/**
 * Recalculates the score for a use case and returns the score change info
 */
export async function recalculateScoreAndGetChange(
  supabase: SupabaseClient,
  usecaseId: string,
  token: string,
  baseUrl: string,
  options?: { path_mode?: 'short' }
): Promise<{
  previousScore: number | null
  newScore: number | null
  pointsGained: number
} | null> {
  const { data: usecase } = await supabase
    .from('usecases')
    .select('score_final, short_path_initial_score, path_mode')
    .eq('id', usecaseId)
    .single()

  const useShortPathScore =
    options?.path_mode === 'short' || usecase?.path_mode === 'short'
  const previousScore = useShortPathScore
    ? (usecase?.short_path_initial_score ?? usecase?.score_final ?? null)
    : (usecase?.score_final ?? null)

  const pathModeForCalc = options?.path_mode === 'short' ? 'short' : undefined

  try {
    const response = await fetch(`${baseUrl}/api/usecases/${usecaseId}/calculate-score`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usecase_id: usecaseId,
        ...(pathModeForCalc === 'short' ? { path_mode: 'short' } : {}),
      })
    })

    if (!response.ok) {
      console.error(`[TODO-SYNC] Score calculation failed:`, await response.text())
      return null
    }

    const result = await response.json()
    const newScore = result.scores?.score_final ?? null

    console.log(`[TODO-SYNC] Score recalculated: ${previousScore} -> ${newScore}`)

    return {
      previousScore,
      newScore,
      pointsGained: (newScore ?? 0) - (previousScore ?? 0)
    }
  } catch (error) {
    console.error(`[TODO-SYNC] Error calling score calculation:`, error)
    return null
  }
}

/**
 * Recalcule le score d'un cas d'usage après sync dossier/TODO,
 * en lisant `path_mode` en base et en déléguant à `/calculate-score`.
 */
export async function recalculateDossierUseCaseScore(
  supabase: SupabaseClient,
  usecaseId: string,
  token: string,
  baseUrl: string
): Promise<{
  previousScore: number | null
  newScore: number | null
  pointsGained: number
} | null> {
  const { data: usecasePathRow } = await supabase
    .from('usecases')
    .select('path_mode')
    .eq('id', usecaseId)
    .single()

  return recalculateScoreAndGetChange(
    supabase,
    usecaseId,
    token,
    baseUrl,
    usecasePathRow?.path_mode === 'short' ? { path_mode: 'short' } : undefined
  )
}
