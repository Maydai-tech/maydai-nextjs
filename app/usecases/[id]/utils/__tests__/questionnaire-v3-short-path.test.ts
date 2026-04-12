import { V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'
import {
  collectV3ActiveQuestionCodes,
  getNextE5ShortV3,
  getNextQuestionV3,
} from '../questionnaire-v3-graph'

describe('questionnaire V3 parcours court (navigation)', () => {
  const ctxMinimal = {
    'E4.N7.Q2': ['E4.N7.Q2.G'],
    'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
    'E4.N7.Q3': ['E4.N7.Q3.E'],
    'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
  } as Record<string, unknown>

  test('après T1E sans média : long → E5, short → E5.N9.Q1 (mini-pack)', () => {
    const a = {
      ...ctxMinimal,
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
      'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.A',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q11.T1E', a, null, 'long')).toBe('E5.N9.Q1')
    expect(getNextQuestionV3('E4.N8.Q11.T1E', a, null, 'short')).toBe('E5.N9.Q1')
  })

  test('Q10 : long → E5 entrée bande, short → E5.N9.Q1', () => {
    const a = {
      ...ctxMinimal,
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'long')).toBe('E5.N9.Q7')
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'short')).toBe('E5.N9.Q1')
  })

  test('Q3.1 ORS unacceptable : long → E5.N9.Q7, short → null', () => {
    const a = {
      'E4.N7.Q3': ['E4.N7.Q3.E'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.A'],
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N7.Q3.1', a, null, 'long')).toBe('E5.N9.Q7')
    expect(getNextQuestionV3('E4.N7.Q3.1', a, null, 'short')).toBeNull()
  })

  test('mini-pack E5 court : Q1 → Q4 → Q6 → Q7 → Q8 → Q9 → Q12', () => {
    const a = { 'E5.N9.Q6': 'E5.N9.Q6.A' } as Record<string, unknown>
    expect(getNextE5ShortV3('E5.N9.Q1', a)).toBe('E5.N9.Q4')
    expect(getNextE5ShortV3('E5.N9.Q4', a)).toBe('E5.N9.Q6')
    expect(getNextE5ShortV3('E5.N9.Q6', a)).toBe('E5.N9.Q7')
    expect(getNextE5ShortV3('E5.N9.Q7', a)).toBe('E5.N9.Q8')
    expect(getNextE5ShortV3('E5.N9.Q8', a)).toBe('E5.N9.Q9')
    expect(getNextE5ShortV3('E5.N9.Q9', a)).toBe('E4.N8.Q12')
  })

  test('collectV3ActiveQuestionCodes short : après Q10 minimal, prochaine question active = E5.N9.Q1', () => {
    const a = {
      ...ctxMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
    } as Record<string, unknown>
    const codes = collectV3ActiveQuestionCodes(a, null, 'short')
    expect(codes.some((c) => c.startsWith('E5.'))).toBe(true)
    expect(codes).toContain('E5.N9.Q1')
    expect(codes).toContain('E4.N8.Q10')
    expect(codes.indexOf('E4.N8.Q10')).toBeLessThan(codes.indexOf('E5.N9.Q1'))
  })

  test('court : après Q12, E6.N10.Q1 si Q9 = interaction (même règle que le long)', () => {
    const a = {
      ...ctxMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.A',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.A',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBe('E6.N10.Q1')
  })

  test('court : après Q12, E6.N10.Q2 seul si Q11.0 = oui contenu (sans Q9 interaction)', () => {
    const a = {
      ...ctxMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
      'E4.N8.Q11.T1E': 'E4.N8.Q11.T1E.A',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBe('E6.N10.Q2')
  })

  test('produit : Q2.1 interdiction → short termine sans E5', () => {
    const a = {
      'E4.N7.Q3': ['E4.N7.Q3.E'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N7.Q2.1': ['E4.N7.Q2.1.A'],
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N7.Q2.1', a, V3_PRODUCT_SYSTEM_TYPE, 'short')).toBeNull()
  })
})
