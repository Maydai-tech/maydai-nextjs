import { V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'
import {
  collectV3ActiveQuestionCodes,
  getNextQuestionV3,
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_MINIPACK_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '../questionnaire-v3-graph'

describe('questionnaire V3 parcours court (navigation)', () => {
  const ctxMinimal = {
    'E4.N7.Q2': ['E4.N7.Q2.G'],
    'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
    'E4.N7.Q3': ['E4.N7.Q3.E'],
    'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
  } as Record<string, unknown>

  test('après T1 sans média : long → E5, short → mini-pack consolidé, sans T1E/T2', () => {
    const a = {
      ...ctxMinimal,
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q11.T1', a, null, 'long')).toBe('E5.N9.Q1')
    expect(getNextQuestionV3('E4.N8.Q11.T1', a, null, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
  })

  test('Q10 : long → E5.N9.Q1, short → mini-pack consolidé', () => {
    const a = {
      ...ctxMinimal,
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'long')).toBe('E5.N9.Q1')
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
  })

  test('chaîne parcours court : entreprise → usage → transparence → fin (sans E4.N8.Q12)', () => {
    expect(getNextQuestionV3(V3_SHORT_ENTREPRISE_ID, {}, null, 'short')).toBe(V3_SHORT_USAGE_ID)
    expect(getNextQuestionV3(V3_SHORT_USAGE_ID, {}, null, 'short')).toBe(V3_SHORT_TRANSPARENCE_ID)
    expect(getNextQuestionV3(V3_SHORT_TRANSPARENCE_ID, {}, null, 'short')).toBeNull()
  })

  test('ancien nœud consolidé → entrée sur la première étape courte', () => {
    expect(getNextQuestionV3(V3_SHORT_MINIPACK_ID, {}, null, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
  })

  test('Q3.1 ORS unacceptable : long → E5.N9.Q1, short → pack entreprise (pas d’arrêt anticipé)', () => {
    const a = {
      'E4.N7.Q3': ['E4.N7.Q3.E'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.A'],
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N7.Q3.1', a, null, 'long')).toBe('E5.N9.Q1')
    expect(getNextQuestionV3('E4.N7.Q3.1', a, null, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
  })

  test('collectV3ActiveQuestionCodes short : après Q10, les 3 étapes synthétiques (sans E4.N8.Q12 ni E5.N9.Q*)', () => {
    const a = {
      ...ctxMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      [V3_SHORT_ENTREPRISE_ID]: [],
      [V3_SHORT_USAGE_ID]: [],
      [V3_SHORT_TRANSPARENCE_ID]: [],
    } as Record<string, unknown>
    const codes = collectV3ActiveQuestionCodes(a, null, 'short')
    expect(codes.some((c) => /^E5\.N9\.Q/.test(c))).toBe(false)
    expect(codes).toContain(V3_SHORT_ENTREPRISE_ID)
    expect(codes).toContain(V3_SHORT_USAGE_ID)
    expect(codes).toContain(V3_SHORT_TRANSPARENCE_ID)
    expect(codes).not.toContain('E4.N8.Q12')
    expect(codes).toContain('E4.N8.Q10')
  })

  test('court : E4.N8.Q12 hors navigation (réservé au parcours long après E5)', () => {
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
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBeNull()
  })

  test('court : E4.N8.Q12 sans enchaînement E6 en short', () => {
    const a = {
      ...ctxMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.D',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBeNull()
  })

  test('court : question E5 isolée → null (pas de fuite mini-pack)', () => {
    const a = { 'E5.N9.Q6': 'E5.N9.Q6.A' } as Record<string, unknown>
    expect(getNextQuestionV3('E5.N9.Q1', a, null, 'short')).toBeNull()
  })

  test('produit : Q2.1 interdiction → short enchaîne sur le pack entreprise (sans E5)', () => {
    const a = {
      'E4.N7.Q3': ['E4.N7.Q3.E'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N7.Q2.1': ['E4.N7.Q2.1.A'],
    } as Record<string, unknown>
    expect(getNextQuestionV3('E4.N7.Q2.1', a, V3_PRODUCT_SYSTEM_TYPE, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
  })
})
