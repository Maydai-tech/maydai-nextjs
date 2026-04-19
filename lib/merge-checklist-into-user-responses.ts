/**
 * Fusionne les codes d’options stockés dans `usecases.checklist_gov_*` avec les
 * réponses `usecase_responses` pour alimenter les moteurs de score (même tunnel
 * que les réponses individuelles).
 */

import { loadQuestions } from '@/app/usecases/[id]/utils/questions-loader'
import type { Question } from '@/app/usecases/[id]/types/usecase'

/** Sous-ensemble des champs `UserResponse` nécessaires à la fusion (évite import circulaire). */
export type MergeableUserResponse = {
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  conditional_keys?: string[]
  conditional_values?: string[]
}

function findQuestionForOptionCode(
  optionCode: string,
  questions: Record<string, Question>
): { questionId: string; question: Question } | null {
  for (const [questionId, question] of Object.entries(questions)) {
    if (!question?.options?.length) continue
    if (question.options.some((o) => o.code === optionCode)) {
      return { questionId, question }
    }
  }
  return null
}

function emptyUserResponse(question_code: string): MergeableUserResponse {
  return {
    question_code,
    single_value: undefined,
    multiple_codes: undefined,
    conditional_main: undefined,
    conditional_keys: undefined,
    conditional_values: undefined,
  }
}

/**
 * Ajoute ou fusionne des réponses synthétiques à partir de tableaux de codes d’options.
 * Ignore les codes inconnus du référentiel `questions-with-scores.json`.
 */
export function mergeChecklistIntoUserResponses(
  responses: MergeableUserResponse[],
  checklistGovEnterprise?: string[] | null,
  checklistGovUsecase?: string[] | null
): MergeableUserResponse[] {
  const questions = loadQuestions() as Record<string, Question>
  const byQuestion = new Map<string, MergeableUserResponse>()

  for (const r of responses) {
    if (!r?.question_code) continue
    byQuestion.set(r.question_code, { ...r })
  }

  const ingestOptionCode = (optionCode: string) => {
    const trimmed = typeof optionCode === 'string' ? optionCode.trim() : ''
    if (!trimmed) return
    const found = findQuestionForOptionCode(trimmed, questions)
    if (!found) return
    const { questionId, question } = found
    const prev = byQuestion.get(questionId) ?? emptyUserResponse(questionId)

    if (question.type === 'radio' || question.type === 'conditional') {
      byQuestion.set(questionId, {
        ...prev,
        question_code: questionId,
        single_value: trimmed,
        multiple_codes: undefined,
      })
      return
    }

    const set = new Set<string>()
    if (Array.isArray(prev.multiple_codes)) {
      for (const c of prev.multiple_codes) {
        if (typeof c === 'string' && c.trim()) set.add(c.trim())
      }
    }
    set.add(trimmed)
    byQuestion.set(questionId, {
      ...prev,
      question_code: questionId,
      multiple_codes: [...set],
      multiple_labels: prev.multiple_labels ?? [...set],
    })
  }

  for (const c of checklistGovEnterprise ?? []) ingestOptionCode(c)
  for (const c of checklistGovUsecase ?? []) ingestOptionCode(c)

  return Array.from(byQuestion.values())
}

/** Même logique pour les lignes brutes API / Supabase (champs nullable). */
export function mergeChecklistIntoDbResponseRows<
  T extends {
    question_code: string
    single_value?: string | null
    multiple_codes?: string[] | null
    multiple_labels?: string[] | null
    conditional_main?: string | null
    conditional_keys?: string[] | null
    conditional_values?: string[] | null
  },
>(rows: T[], checklistGovEnterprise?: string[] | null, checklistGovUsecase?: string[] | null): T[] {
  const asUser: MergeableUserResponse[] = (rows ?? []).map((r) => ({
    question_code: r.question_code,
    single_value: r.single_value ?? undefined,
    multiple_codes: r.multiple_codes ?? undefined,
    conditional_main: r.conditional_main ?? undefined,
    conditional_keys: r.conditional_keys ?? undefined,
    conditional_values: r.conditional_values ?? undefined,
  }))
  const merged = mergeChecklistIntoUserResponses(asUser, checklistGovEnterprise, checklistGovUsecase)
  const mergedByCode = new Map(merged.map((m) => [m.question_code, m]))

  const out: T[] = []
  const seen = new Set<string>()
  for (const r of rows ?? []) {
    if (!r?.question_code) continue
    const m = mergedByCode.get(r.question_code)
    if (!m) continue
    seen.add(r.question_code)
    out.push({
      ...r,
      single_value: m.single_value ?? null,
      multiple_codes: m.multiple_codes ?? null,
      multiple_labels: m.multiple_labels ?? r.multiple_labels ?? null,
      conditional_main: m.conditional_main ?? null,
      conditional_keys: m.conditional_keys ?? null,
      conditional_values: m.conditional_values ?? null,
    })
  }
  for (const m of merged) {
    if (seen.has(m.question_code)) continue
    out.push({
      question_code: m.question_code,
      single_value: m.single_value ?? null,
      multiple_codes: m.multiple_codes ?? null,
      multiple_labels: m.multiple_labels ?? null,
      conditional_main: m.conditional_main ?? null,
      conditional_keys: m.conditional_keys ?? null,
      conditional_values: m.conditional_values ?? null,
    } as T)
  }
  return out
}
