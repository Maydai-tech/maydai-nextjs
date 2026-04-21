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
    training_census: 'Formations AI Act documentees',
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
    training_census: 'Formations AI Act reintialisees',
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
  previousValue: string | null
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

  const codes = mappings.map(m => m.questionCode)
  const { data: existingRows } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value')
    .eq('usecase_id', usecaseId)
    .in('question_code', codes)

  const previousByCode = new Map<string, string | null>()
  for (const m of mappings) {
    previousByCode.set(m.questionCode, null)
  }
  for (const row of existingRows ?? []) {
    const qc = row.question_code as string | undefined
    if (!qc) continue
    const sv = row.single_value
    previousByCode.set(qc, typeof sv === 'string' ? sv : null)
  }

  const perMapping = await Promise.all(
    mappings.map(m =>
      syncOneTodoMappingToResponse(
        supabase,
        usecaseId,
        m,
        userEmail,
        previousByCode.get(m.questionCode) ?? null
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
  previousValue: string | null
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

  console.log(
    `[TODO-REVERSE] Updating ${mapping.questionCode} from ${previousValue} to ${mapping.negativeAnswerCode}`
  )
  console.log(
    `[TODO-REVERSE] Was positive answer: ${wasPositiveAnswer}, Expected points lost: ${wasPositiveAnswer ? mapping.expectedPointsGained : 0}`
  )

  const { error } = await supabase.from('usecase_responses').upsert(
    {
      usecase_id: usecaseId,
      question_code: mapping.questionCode,
      single_value: mapping.negativeAnswerCode,
      answered_by: userEmail,
      answered_at: new Date().toISOString(),
      multiple_codes: null,
      multiple_labels: null,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null,
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

  const codes = reversible.map(m => m.questionCode)
  const { data: existingRows } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value')
    .eq('usecase_id', usecaseId)
    .in('question_code', codes)

  const previousByCode = new Map<string, string | null>()
  for (const m of reversible) {
    previousByCode.set(m.questionCode, null)
  }
  for (const row of existingRows ?? []) {
    const qc = row.question_code as string | undefined
    if (!qc) continue
    const sv = row.single_value
    previousByCode.set(qc, typeof sv === 'string' ? sv : null)
  }

  const perMapping = await Promise.all(
    reversible.map(m =>
      reverseOneTodoMappingResponse(
        supabase,
        usecaseId,
        m,
        userEmail,
        previousByCode.get(m.questionCode) ?? null
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
  baseUrl: string
): Promise<{
  previousScore: number | null
  newScore: number | null
  pointsGained: number
} | null> {
  // Get current score before recalculation
  const { data: usecase } = await supabase
    .from('usecases')
    .select('score_final')
    .eq('id', usecaseId)
    .single()

  const previousScore = usecase?.score_final ?? null

  // Call the score calculation endpoint
  try {
    const response = await fetch(`${baseUrl}/api/usecases/${usecaseId}/calculate-score`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usecase_id: usecaseId })
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
