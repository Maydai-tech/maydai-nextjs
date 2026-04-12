import type { QuestionProgress } from '../types/usecase'
import { getNextQuestionV3 } from './questionnaire-v3-graph'

let cachedMaxTotalQuestionsV3: number | null = null
const maxRemainingCacheV3 = new Map<string, number>()

const SYSTEM_TYPE_VARIANTS: (string | null)[] = [null, 'Produit', 'Système autonome']

const CTX_ORS_MINIMAL: Record<string, unknown> = {
  'E4.N7.Q2': ['E4.N7.Q2.G'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
}

const CTX_ORS_HIGH: Record<string, unknown> = {
  'E4.N7.Q2': ['E4.N7.Q2.A'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
}

function mergeCtx(
  base: Record<string, unknown>,
  ...parts: Record<string, unknown>[]
): Record<string, unknown> {
  return Object.assign({}, ...parts, base)
}

/**
 * Contextes partiels pour borner les branches V3 (DFS progression).
 */
function generateAnswerContextsV3(questionId: string): Record<string, unknown>[] {
  switch (questionId) {
    case 'E4.N7.Q1':
      return [{ 'E4.N7.Q1': 'E4.N7.Q1.A' }, { 'E4.N7.Q1': 'E4.N7.Q1.B' }]
    case 'E4.N7.Q3.1':
      return [{ 'E4.N7.Q3.1': ['E4.N7.Q3.1.E'] }, { 'E4.N7.Q3.1': ['E4.N7.Q3.1.A'] }]
    case 'E4.N7.Q2.1':
      return [{ 'E4.N7.Q2.1': ['E4.N7.Q2.1.E'] }, { 'E4.N7.Q2.1': ['E4.N7.Q2.1.A'] }]
    case 'E4.N7.Q4':
      return [
        { 'E4.N7.Q4': 'E4.N7.Q4.A' },
        { 'E4.N7.Q4': 'E4.N7.Q4.B' },
        { 'E4.N7.Q4': 'E4.N7.Q4.C' },
      ]
    case 'E4.N7.Q2':
      return [
        mergeCtx({ 'E4.N7.Q2': ['E4.N7.Q2.G'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N7.Q2': ['E4.N7.Q2.A'] }, CTX_ORS_HIGH),
      ]
    case 'E4.N7.Q5':
      return [
        mergeCtx({ 'E4.N7.Q5': 'E4.N7.Q5.A' }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N7.Q5': 'E4.N7.Q5.B' }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N7.Q5': 'E4.N7.Q5.C' }, CTX_ORS_HIGH),
      ]
    case 'E4.N8.Q11.0':
      return [
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.A' },
        mergeCtx({ 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' }, CTX_ORS_HIGH),
      ]
    case 'E4.N8.Q11.1':
      return [
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'] }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.B'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.B'] }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'] }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'] }, CTX_ORS_HIGH),
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
        ),
      ]
    case 'E4.N8.Q11.T1E':
      return [
        mergeCtx(
          {
            'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
            'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
            'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.A',
          },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          {
            'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
            'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
            'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.B',
          },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          {
            'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'],
            'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
            'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.A',
          },
          CTX_ORS_HIGH
        ),
      ]
    case 'E4.N8.Q11.M1':
      return [
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A' }, CTX_ORS_HIGH),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.B' }, CTX_ORS_MINIMAL),
        mergeCtx({ 'E4.N8.Q11.M1': 'E4.N8.Q11.M1.B' }, CTX_ORS_HIGH),
      ]
    case 'E4.N8.Q11.T2':
      return [
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_MINIMAL
        ),
        mergeCtx(
          { 'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'], 'E4.N8.Q11.T2': 'E4.N8.Q11.T2.A' },
          CTX_ORS_HIGH
        ),
      ]
    case 'E4.N8.Q11.M2':
      return [mergeCtx({}, CTX_ORS_MINIMAL), mergeCtx({}, CTX_ORS_HIGH)]
    case 'E5.N9.Q7':
      return [{}, { 'E5.N9.Q6': { selected: 'E5.N9.Q6.B' } }]
    case 'E4.N8.Q12':
      return [
        { 'E4.N7.Q3.1': ['E4.N7.Q3.1.A'] },
        mergeCtx(
          {
            'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
            'E4.N8.Q9': 'E4.N8.Q9.B',
            'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
          },
          CTX_ORS_MINIMAL
        ),
      ]
    case 'E6.N10.Q1':
      return [
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.B' },
        { 'E4.N8.Q11.0': 'E4.N8.Q11.0.A' },
      ]
    default:
      return [{}]
  }
}

function getAllPossibleNextQuestionsV3(questionId: string): string[] {
  const possibleNext = new Set<string>()
  for (const ctx of generateAnswerContextsV3(questionId)) {
    for (const st of SYSTEM_TYPE_VARIANTS) {
      const n = getNextQuestionV3(questionId, ctx, st, 'long')
      if (n) possibleNext.add(n)
    }
  }
  return Array.from(possibleNext)
}

function getMaxRemainingQuestionsV3(questionId: string, visited: Set<string> = new Set()): number {
  if (visited.size === 0 && maxRemainingCacheV3.has(questionId)) {
    return maxRemainingCacheV3.get(questionId)!
  }
  if (visited.has(questionId)) return 0
  visited.add(questionId)

  const possibleNext = getAllPossibleNextQuestionsV3(questionId)
  if (possibleNext.length === 0) {
    const result = 1
    if (visited.size === 1) maxRemainingCacheV3.set(questionId, result)
    return result
  }

  let maxFromBranches = 0
  for (const n of possibleNext) {
    maxFromBranches = Math.max(maxFromBranches, getMaxRemainingQuestionsV3(n, new Set(visited)))
  }
  const result = 1 + maxFromBranches
  if (visited.size === 1) maxRemainingCacheV3.set(questionId, result)
  return result
}

export function resetProgressCacheV3(): void {
  cachedMaxTotalQuestionsV3 = null
  maxRemainingCacheV3.clear()
}

export function getAbsoluteQuestionProgressV3(currentQuestionId: string): QuestionProgress {
  if (cachedMaxTotalQuestionsV3 === null) {
    cachedMaxTotalQuestionsV3 = getMaxRemainingQuestionsV3('E4.N7.Q1')
  }
  const maxTotal = cachedMaxTotalQuestionsV3
  const maxRemaining = getMaxRemainingQuestionsV3(currentQuestionId)
  const current = maxTotal - maxRemaining + 1
  const percentage = Math.round((current / maxTotal) * 100)
  return { current, total: maxTotal, percentage }
}

export function getCurrentQuestionPositionV3(currentQuestionId: string): number {
  if (cachedMaxTotalQuestionsV3 === null) {
    cachedMaxTotalQuestionsV3 = getMaxRemainingQuestionsV3('E4.N7.Q1')
  }
  const maxRemaining = getMaxRemainingQuestionsV3(currentQuestionId)
  return cachedMaxTotalQuestionsV3 - maxRemaining + 1
}
