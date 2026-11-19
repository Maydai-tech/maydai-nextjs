import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getQuestionById } from '@/app/(saas)/usecases/[id]/utils/questions-loader'
import { ANNEX_NONE_OPTION_CODE } from '@/lib/mistral/map-evaluation-nodes'
import { logger } from '@/lib/secure-logger'

/** Art. 6.3 — n’a de sens que si Annexe III est un domaine sensible, pas « Aucun ». */
export const ANNEX_III_FOLLOW_UP_QUESTION_CODE = 'E4.N7.Q5'

export type GraphAnswers = Record<string, string | string[]>

export type PersistableResponse = {
  question_code: string
  single_value: string | null
  multiple_codes: string[] | null
  multiple_labels: string[] | null
}

export function toPersistableResponse(
  questionCode: string,
  value: string | string[]
): PersistableResponse | null {
  const question = getQuestionById(questionCode)
  const codes = Array.isArray(value) ? value : [value]
  const labels = codes.map((code) => {
    const option = question?.options.find((item) => item.code === code)
    return option?.label || code
  })

  if (question?.type === 'checkbox' || question?.type === 'tags' || Array.isArray(value)) {
    return {
      question_code: questionCode,
      single_value: null,
      multiple_codes: codes,
      multiple_labels: labels,
    }
  }

  if (typeof value === 'string' && value.trim()) {
    return {
      question_code: questionCode,
      single_value: value,
      multiple_codes: null,
      multiple_labels: null,
    }
  }

  return null
}

export function responsesToGraphAnswers(
  rows: Array<{
    question_code?: string | null
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
  }>
): GraphAnswers {
  const answers: GraphAnswers = {}
  for (const row of rows) {
    const code = row.question_code
    if (!code) continue
    if (Array.isArray(row.multiple_codes) && row.multiple_codes.length > 0) {
      answers[code] = row.multiple_codes
      continue
    }
    if (typeof row.conditional_main === 'string' && row.conditional_main.trim()) {
      answers[code] = row.conditional_main
      continue
    }
    if (typeof row.single_value === 'string' && row.single_value.trim()) {
      answers[code] = row.single_value
    }
  }
  return answers
}

export async function loadUsecaseGraphAnswers(
  supabase: SupabaseClient,
  usecaseId: string
): Promise<GraphAnswers> {
  const { data, error } = await supabase
    .from('usecase_responses')
    .select('question_code, single_value, multiple_codes, conditional_main')
    .eq('usecase_id', usecaseId)

  if (error) {
    logger.error('loadUsecaseGraphAnswers', undefined, { details: error.message })
    throw new Error('Impossible de lire les réponses du cas d’usage')
  }

  return responsesToGraphAnswers(data ?? [])
}

function annexIiiCodes(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/**
 * Q5 (art. 6.3) ne s’applique que si Q2 est un domaine Annexe III sensible.
 * Quand un patch pose Q2 = « Aucun » (G), la réponse Q5 restante en base
 * fausse la qualification (ex. Q5.C → classification_status = impossible).
 */
export function followUpQuestionCodesToClear(answers: GraphAnswers): string[] {
  if (!Object.prototype.hasOwnProperty.call(answers, 'E4.N7.Q2')) return []
  const codes = annexIiiCodes(answers['E4.N7.Q2'])
  if (codes.length === 1 && codes[0] === ANNEX_NONE_OPTION_CODE) {
    return [ANNEX_III_FOLLOW_UP_QUESTION_CODE]
  }
  return []
}

export async function deleteUsecaseGraphAnswers(
  supabase: SupabaseClient,
  usecaseId: string,
  questionCodes: string[]
): Promise<void> {
  const codes = [...new Set(questionCodes.filter((code) => typeof code === 'string' && code.trim()))]
  if (codes.length === 0) return

  const { error } = await supabase
    .from('usecase_responses')
    .delete()
    .eq('usecase_id', usecaseId)
    .in('question_code', codes)

  if (error) {
    logger.error('deleteUsecaseGraphAnswers', undefined, {
      details: error.message,
      questionCodes: codes,
    })
    throw new Error('Impossible d’enregistrer les réponses')
  }
}

export async function upsertUsecaseGraphAnswers(
  supabase: SupabaseClient,
  user: User,
  usecaseId: string,
  answers: GraphAnswers
): Promise<void> {
  const now = new Date().toISOString()
  const answeredBy = user.email || user.id

  for (const [questionCode, value] of Object.entries(answers)) {
    const persistable = toPersistableResponse(questionCode, value)
    if (!persistable) continue

    const payload = {
      usecase_id: usecaseId,
      question_code: persistable.question_code,
      answered_by: answeredBy,
      answered_at: now,
      updated_at: now,
      single_value: persistable.single_value,
      multiple_codes: persistable.multiple_codes,
      multiple_labels: persistable.multiple_labels,
      conditional_main: null,
      conditional_keys: null,
      conditional_values: null,
    }

    const { data: existing, error: existingError } = await supabase
      .from('usecase_responses')
      .select('id')
      .eq('usecase_id', usecaseId)
      .eq('question_code', questionCode)
      .maybeSingle()

    if (existingError) {
      logger.error('upsertUsecaseGraphAnswers: lecture', undefined, {
        details: existingError.message,
        questionCode,
      })
      throw new Error('Impossible d’enregistrer les réponses')
    }

    if (existing?.id) {
      const { error } = await supabase
        .from('usecase_responses')
        .update(payload)
        .eq('id', existing.id)
      if (error) {
        logger.error('upsertUsecaseGraphAnswers: update', undefined, {
          details: error.message,
          questionCode,
        })
        throw new Error('Impossible d’enregistrer les réponses')
      }
    } else {
      const { error } = await supabase.from('usecase_responses').insert(payload)
      if (error) {
        logger.error('upsertUsecaseGraphAnswers: insert', undefined, {
          details: error.message,
          questionCode,
        })
        throw new Error('Impossible d’enregistrer les réponses')
      }
    }
  }

  await deleteUsecaseGraphAnswers(supabase, usecaseId, followUpQuestionCodesToClear(answers))
}
