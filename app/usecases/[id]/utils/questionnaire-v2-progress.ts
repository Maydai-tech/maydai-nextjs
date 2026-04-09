import type { QuestionProgress } from '../types/usecase'
import { getNextQuestionV2 } from './questionnaire-v2-graph'

let cachedMaxTotalQuestionsV2: number | null = null
const maxRemainingCacheV2 = new Map<string, number>()

/** Contextes ORS pour borner les sorties N8 → E5 (minimal = Q7, limited/high = Q1) dans l’exploration DFS. */
const CTX_ORS_MINIMAL: Record<string, unknown> = {
  'E4.N7.Q2': ['E4.N7.Q2.G'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E']
}

const CTX_ORS_HIGH: Record<string, unknown> = {
  'E4.N7.Q2': ['E4.N7.Q2.A'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E']
}

function mergeCtx(
  base: Record<string, unknown>,
  ...parts: Record<string, unknown>[]
): Record<string, unknown> {
  return Object.assign({}, ...parts, base)
}

function generateAnswerContextsV2(questionId: string): Record<string, unknown>[] {
  switch (questionId) {
    case 'E4.N7.Q1':
      return [{ 'E4.N7.Q1': 'E4.N7.Q1.A' }, { 'E4.N7.Q1': 'E4.N7.Q1.B' }]
    case 'E4.N7.Q3.1':
      return [{ 'E4.N7.Q3.1': ['E4.N7.Q3.1.E'] }, { 'E4.N7.Q3.1': ['E4.N7.Q3.1.A'] }]
    case 'E4.N8.Q11.0':
      return [
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.A' },
        mergeCtx({ 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' }, CTX_ORS_HIGH)
      ]
    case 'E4.N8.Q11.1':
      return [
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'] }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.B'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.B'] }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'] }, CTX_ORS_HIGH)
      ]
    case 'E4.N8.Q11.T1':
      return [
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B' },
          CTX_ORS_HIGH
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A' },
          CTX_ORS_HIGH
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'], 'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B' },
          CTX_ORS_HIGH
        )
      ]
    case 'E4.N8.Q11.M1':
      return [
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A' }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.B' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.B' }, CTX_ORS_HIGH)
      ]
    case 'E4.N8.Q11.T2':
      return [
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_HIGH
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_HIGH
        )
      ]
    case 'E4.N8.Q11.M2':
      return [mergeCtx({}, CTX_ORS_MINIMAL), mergeCtx({}, CTX_ORS_HIGH)]
    case 'E5.N9.Q7':
      return [
        {},
        { 'E5.N9.Q6': { selected: 'E5.N9.Q6.B' } }
      ]
    case 'E4.N8.Q12':
      return [
        { 'E4.N7.Q3.1': ['E4.N7.Q3.1.A'] },
        mergeCtx(
          {
            'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
            'E4.N8.Q9': 'E4.N8.Q9.B',
            'E4.N8.Q11.0': 'E4.N8.Q11.0.B'
          },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          {
            'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
            'E4.N8.Q9': 'E4.N8.Q9.A',
            'E4.N8.Q11.0': 'E4.N8.Q11.0.B'
          },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          {
            'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
            'E4.N8.Q9': 'E4.N8.Q9.B',
            'E4.N8.Q11.0': 'E4.N8.Q11.0.A'
          },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          {
            'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
            'E4.N8.Q9': 'E4.N8.Q9.A',
            'E4.N8.Q11.0': 'E4.N8.Q11.0.A'
          },
          CTX_ORS_MINIMAL
        )
      ]
    case 'E6.N10.Q1':
      return [
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' },
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.A' }
      ]
    default:
      return [{}]
  }
}

function getAllPossibleNextQuestionsV2(questionId: string): string[] {
  const possibleNext = new Set<string>()
  for (const ctx of generateAnswerContextsV2(questionId)) {
    const next = getNextQuestionV2(questionId, ctx)
    if (next) possibleNext.add(next)
  }
  return Array.from(possibleNext)
}

function getMaxRemainingQuestionsV2(questionId: string, visited: Set<string> = new Set()): number {
  if (visited.size === 0 && maxRemainingCacheV2.has(questionId)) {
    return maxRemainingCacheV2.get(questionId)!
  }
  if (visited.has(questionId)) return 0
  visited.add(questionId)

  const possibleNext = getAllPossibleNextQuestionsV2(questionId)
  if (possibleNext.length === 0) {
    const result = 1
    if (visited.size === 1) maxRemainingCacheV2.set(questionId, result)
    return result
  }

  let maxFromBranches = 0
  for (const n of possibleNext) {
    maxFromBranches = Math.max(maxFromBranches, getMaxRemainingQuestionsV2(n, new Set(visited)))
  }
  const result = 1 + maxFromBranches
  if (visited.size === 1) maxRemainingCacheV2.set(questionId, result)
  return result
}

export function resetProgressCacheV2(): void {
  cachedMaxTotalQuestionsV2 = null
  maxRemainingCacheV2.clear()
}

export function getAbsoluteQuestionProgressV2(currentQuestionId: string): QuestionProgress {
  if (cachedMaxTotalQuestionsV2 === null) {
    cachedMaxTotalQuestionsV2 = getMaxRemainingQuestionsV2('E4.N7.Q1')
  }
  const maxTotal = cachedMaxTotalQuestionsV2
  const maxRemaining = getMaxRemainingQuestionsV2(currentQuestionId)
  const current = maxTotal - maxRemaining + 1
  const percentage = Math.round((current / maxTotal) * 100)
  return { current, total: maxTotal, percentage }
}

export function getCurrentQuestionPositionV2(currentQuestionId: string): number {
  if (cachedMaxTotalQuestionsV2 === null) {
    cachedMaxTotalQuestionsV2 = getMaxRemainingQuestionsV2('E4.N7.Q1')
  }
  const maxRemaining = getMaxRemainingQuestionsV2(currentQuestionId)
  return cachedMaxTotalQuestionsV2 - maxRemaining + 1
}
