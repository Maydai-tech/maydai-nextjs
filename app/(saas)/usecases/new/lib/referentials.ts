import { loadCreationQuestions } from '../questions-loader'
import type { ClosedFieldOption } from '../types'

/**
 * Returns the list of responsible service options as plain strings.
 * Source of truth: creation-questions.json -> responsible_service.options
 */
export function getResponsibleServiceOptions(): string[] {
  const questions = loadCreationQuestions()
  const q = questions['responsible_service']
  if (!q || !q.options) return []
  return q.options as string[]
}

/**
 * Returns AI category options with labels, examples and tooltips.
 * Source of truth: creation-questions.json -> ai_category.options
 */
export function getAiCategoryOptions(): ClosedFieldOption[] {
  const questions = loadCreationQuestions()
  const q = questions['ai_category']
  if (!q || !q.options) return []
  return q.options as ClosedFieldOption[]
}

/**
 * Returns system type options with labels, examples and tooltips.
 * Source of truth: creation-questions.json -> system_type.options
 */
export function getSystemTypeOptions(): ClosedFieldOption[] {
  const questions = loadCreationQuestions()
  const q = questions['system_type']
  if (!q || !q.options) return []
  return q.options as ClosedFieldOption[]
}
