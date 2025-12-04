/**
 * Utility for syncing todo action completions with questionnaire responses
 *
 * When a dossier document is uploaded (e.g., technical_documentation),
 * this utility updates the corresponding questionnaire response and
 * recalculates the use case score.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import questionsData from '@/app/usecases/[id]/data/questions-with-scores.json'

interface TodoActionMapping {
  questionCode: string
  positiveAnswerCode: string
  negativeAnswerCode: string | null
  expectedPointsGained: number
  reason: string
}

/**
 * Finds the question and positive/negative answer codes for a given todo_action
 * by scanning questions-with-scores.json for questions with todo_action property
 *
 * The todo_action is now at the question level (not option level)
 * The positive answer is the one with score_impact: 0 (typically "Oui")
 * The negative answer is the one with negative score_impact (typically "Non")
 */
export function getTodoActionMapping(todoAction: string): TodoActionMapping | null {
  // Scan all questions to find the one with this todo_action at question level
  for (const [questionCode, question] of Object.entries(questionsData)) {
    const questionObj = question as any

    // Check if this question has the todo_action we're looking for
    if (questionObj.todo_action !== todoAction) continue
    if (!questionObj.options) continue

    // Find the positive answer (score_impact = 0 or undefined, typically "Oui")
    // and the negative answer (negative score_impact, typically "Non")
    let positiveAnswerCode: string | null = null
    let negativeAnswerCode: string | null = null
    let positiveImpact = 0
    let negativeImpact = 0

    for (const option of questionObj.options) {
      const impact = option.score_impact ?? 0

      if (impact < 0) {
        // This is the negative answer
        negativeAnswerCode = option.code
        negativeImpact = impact
      } else if (impact === 0 && !positiveAnswerCode) {
        // This is the positive answer (first one with 0 impact)
        positiveAnswerCode = option.code
        positiveImpact = impact
      }
    }

    // If we didn't find a positive answer, use the first option with 0 or positive impact
    if (!positiveAnswerCode) {
      for (const option of questionObj.options) {
        const impact = option.score_impact ?? 0
        if (impact >= 0) {
          positiveAnswerCode = option.code
          positiveImpact = impact
          break
        }
      }
    }

    if (!positiveAnswerCode) {
      console.warn(`[TODO-SYNC] No positive answer found for question ${questionCode}`)
      return null
    }

    // Expected points gained = positive_impact - negative_impact
    // e.g., 0 - (-10) = +10 points
    const expectedPointsGained = positiveImpact - negativeImpact

    return {
      questionCode,
      positiveAnswerCode,
      negativeAnswerCode,
      expectedPointsGained,
      reason: getReasonForTodoAction(todoAction)
    }
  }

  return null
}

/**
 * Returns a human-readable reason for why the score changed
 */
function getReasonForTodoAction(todoAction: string): string {
  const reasons: Record<string, string> = {
    technical_documentation: 'Documentation technique ajoutee',
    transparency_marking: 'Marquage de transparence ajoute',
    continuous_monitoring: 'Surveillance continue mise en place',
    risk_management: 'Systeme de gestion des risques etabli',
    data_quality: 'Procedures qualite des donnees ajoutees',
    registry_proof: 'Preuve de registre ajoutee',
    human_oversight: 'Surveillance humaine mise en place'
  }
  return reasons[todoAction] || 'Document de conformite ajoute'
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
  const mapping = getTodoActionMapping(todoAction)
  if (!mapping) {
    console.log(`[TODO-SYNC] No mapping found for todo_action: ${todoAction}`)
    return { changed: false, shouldRecalculate: false, previousValue: null, expectedPointsGained: 0 }
  }

  console.log(`[TODO-SYNC] Found mapping for ${todoAction}:`, mapping)

  // Check current response value
  const { data: existingResponse } = await supabase
    .from('usecase_responses')
    .select('single_value')
    .eq('usecase_id', usecaseId)
    .eq('question_code', mapping.questionCode)
    .maybeSingle()

  const previousValue = existingResponse?.single_value || null

  // If already set to the positive answer, no change needed
  if (previousValue === mapping.positiveAnswerCode) {
    console.log(`[TODO-SYNC] Response already set to positive value, no change needed`)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsGained: 0 }
  }

  // Check if previous value was the negative answer (score should increase)
  const wasNegativeAnswer = previousValue === mapping.negativeAnswerCode

  console.log(`[TODO-SYNC] Updating response from ${previousValue} to ${mapping.positiveAnswerCode}`)
  console.log(`[TODO-SYNC] Was negative answer: ${wasNegativeAnswer}, Expected points: ${wasNegativeAnswer ? mapping.expectedPointsGained : 0}`)

  // Update or insert the response
  const { error } = await supabase
    .from('usecase_responses')
    .upsert({
      usecase_id: usecaseId,
      question_code: mapping.questionCode,
      single_value: mapping.positiveAnswerCode,
      answered_by: userEmail,
      answered_at: new Date().toISOString(),
      // Reset other fields
      multiple_codes: null,
      multiple_labels: null,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null
    }, {
      onConflict: 'usecase_id,question_code'
    })

  if (error) {
    console.error(`[TODO-SYNC] Error updating response:`, error)
    return { changed: false, shouldRecalculate: false, previousValue, expectedPointsGained: 0 }
  }

  console.log(`[TODO-SYNC] Response updated successfully`)

  // Only recalculate score if the previous answer was the negative one
  // (changing from "Non" to "Oui" gives points; changing from null to "Oui" doesn't)
  return {
    changed: true,
    shouldRecalculate: wasNegativeAnswer,
    previousValue,
    expectedPointsGained: wasNegativeAnswer ? mapping.expectedPointsGained : 0
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
