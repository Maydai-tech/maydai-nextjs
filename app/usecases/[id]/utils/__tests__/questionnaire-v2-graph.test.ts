import {
  deriveBpgvBandFromOrsAnswers,
  getFirstE5AfterOrs,
  getNextQuestionV2,
  isOrsUnacceptableAtQ31
} from '../questionnaire-v2-graph'
import { getNextQuestion, resetProgressCache } from '../questionnaire'
import { QUESTIONNAIRE_VERSION_V1, QUESTIONNAIRE_VERSION_V2 } from '@/lib/questionnaire-version'
import { BPGV_VARIANT_HIGH, BPGV_VARIANT_LIMITED, BPGV_VARIANT_MINIMAL } from '@/lib/questionnaire-version'

describe('questionnaire V2 graph', () => {
  const baseN7 = {
    'E4.N7.Q1': 'E4.N7.Q1.B',
    'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
    'E4.N7.Q2': ['E4.N7.Q2.G'],
    'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
    'E4.N7.Q3': ['E4.N7.Q3.E']
  }

  it('V1 : après Q3.1 « aucune situation », enchaîne vers E5.N9.Q4 (inchangé)', () => {
    resetProgressCache()
    const next = getNextQuestion(
      'E4.N7.Q3.1',
      { ...baseN7, 'E4.N7.Q3.1': ['E4.N7.Q3.1.E'] },
      QUESTIONNAIRE_VERSION_V1
    )
    expect(next).toBe('E5.N9.Q4')
  })

  it('V2 : après Q3.1 sans situation interdite, démarre ORS N8 en E4.N8.Q9 (pas Q2–Q8, pas d’E5)', () => {
    const next = getNextQuestionV2('E4.N7.Q3.1', {
      ...baseN7,
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E']
    })
    expect(next).toBe('E4.N8.Q9')
  })

  it('V2 : E4.N8.Q2–Q8 hors graphe (pas de transition depuis le switch V2)', () => {
    expect(getNextQuestionV2('E4.N8.Q2', {})).toBeNull()
    expect(getNextQuestionV2('E4.N8.Q8', {})).toBeNull()
  })

  it('V2 : sortie unacceptable après Q3.1 → entrée BPGV complète (E5.N9.Q1)', () => {
    expect(isOrsUnacceptableAtQ31({ 'E4.N7.Q3.1': ['E4.N7.Q3.1.A'] })).toBe(true)
    const next = getNextQuestionV2('E4.N7.Q3.1', {
      ...baseN7,
      'E4.N7.Q3.1': ['E4.N7.Q3.1.A']
    })
    expect(next).toBe('E5.N9.Q1')
  })

  it('V2 : unacceptable puis mini BPGV Q7 → Q12 puis E6 obligatoire', () => {
    const unacceptable = {
      ...baseN7,
      'E4.N7.Q3.1': ['E4.N7.Q3.1.A'],
      'E5.N9.Q7': { selected: 'E5.N9.Q7.B', conditionalValues: { registry_type: 'X', system_name: 'Y' } }
    }
    expect(getNextQuestionV2('E5.N9.Q7', unacceptable)).toBe('E4.N8.Q12')
    expect(getNextQuestionV2('E4.N8.Q12', unacceptable)).toBe('E6.N10.Q1')
  })

  it('V2 : BPGV long — Q7 après Q6 → Q8 → Q9 → Q12', () => {
    const answers = {
      'E5.N9.Q6': { selected: 'E5.N9.Q6.B' },
      'E5.N9.Q7': { selected: 'E5.N9.Q7.B', conditionalValues: { registry_type: 'X', system_name: 'Y' } }
    }
    expect(getNextQuestionV2('E5.N9.Q7', answers)).toBe('E5.N9.Q8')
    expect(getNextQuestionV2('E5.N9.Q8', answers)).toBe('E5.N9.Q9')
    expect(getNextQuestionV2('E5.N9.Q9', answers)).toBe('E4.N8.Q12')
  })

  it('V2 : BPGV limited/high — ordre Q1→…→Q9 puis Q12', () => {
    const e5 = {}
    expect(getNextQuestionV2('E5.N9.Q1', e5)).toBe('E5.N9.Q2')
    expect(getNextQuestionV2('E5.N9.Q2', e5)).toBe('E5.N9.Q3')
    expect(getNextQuestionV2('E5.N9.Q3', e5)).toBe('E5.N9.Q4')
    expect(getNextQuestionV2('E5.N9.Q4', e5)).toBe('E5.N9.Q5')
    expect(getNextQuestionV2('E5.N9.Q5', e5)).toBe('E5.N9.Q6')
    expect(getNextQuestionV2('E5.N9.Q6', e5)).toBe('E5.N9.Q7')
  })

  it('V2 : E6 — après Q12 toujours Q1 puis Q2 (Q9 oui)', () => {
    const a = {
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N8.Q9': 'E4.N8.Q9.A',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B'
    }
    expect(getNextQuestionV2('E4.N8.Q12', a)).toBe('E6.N10.Q1')
    expect(getNextQuestionV2('E6.N10.Q1', a)).toBe('E6.N10.Q2')
    expect(getNextQuestionV2('E6.N10.Q2', a)).toBe(null)
  })

  it('V2 : E6 — après Q12 Q1 puis Q2 même si Q9 non et Q11.0 oui', () => {
    const a = {
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A'
    }
    expect(getNextQuestionV2('E4.N8.Q12', a)).toBe('E6.N10.Q1')
    expect(getNextQuestionV2('E6.N10.Q1', a)).toBe('E6.N10.Q2')
    expect(getNextQuestionV2('E6.N10.Q2', a)).toBe(null)
  })

  it('V2 : E6 — Q9 et Q11.0 oui → Q1 puis Q2', () => {
    const a = {
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N8.Q9': 'E4.N8.Q9.A',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A'
    }
    expect(getNextQuestionV2('E4.N8.Q12', a)).toBe('E6.N10.Q1')
    expect(getNextQuestionV2('E6.N10.Q1', a)).toBe('E6.N10.Q2')
  })

  it('deriveBpgvBandFromOrsAnswers : domaine à risque élevé → high', () => {
    const band = deriveBpgvBandFromOrsAnswers({
      ...baseN7,
      'E4.N7.Q2': ['E4.N7.Q2.A'],
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E']
    })
    expect(band).toBe(BPGV_VARIANT_HIGH)
  })

  it('deriveBpgvBandFromOrsAnswers : interaction limitée (E4.N8.Q9.A) → limited', () => {
    const band = deriveBpgvBandFromOrsAnswers({
      ...baseN7,
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N8.Q9': 'E4.N8.Q9.A'
    })
    expect(band).toBe(BPGV_VARIANT_LIMITED)
  })

  it('getFirstE5AfterOrs : toujours E5.N9.Q1 (plus de raccourci minimal → Q7)', () => {
    expect(getFirstE5AfterOrs({ ...baseN7, 'E4.N7.Q3.1': ['E4.N7.Q3.1.E'] })).toBe('E5.N9.Q1')
    expect(
      getFirstE5AfterOrs({
        ...baseN7,
        'E4.N7.Q2': ['E4.N7.Q2.A'],
        'E4.N7.Q3.1': ['E4.N7.Q3.1.E']
      })
    ).toBe('E5.N9.Q1')
  })

  it('getNext avec version 2 délègue au graphe V2', () => {
    const next = getNextQuestion(
      'E4.N7.Q3.1',
      { ...baseN7, 'E4.N7.Q3.1': ['E4.N7.Q3.1.E'] },
      QUESTIONNAIRE_VERSION_V2
    )
    expect(next).toBe('E4.N8.Q9')
  })

  it('deriveBpgvBandFromOrsAnswers ignore E4.N8.Q2–Q8 même si présentes dans les réponses', () => {
    const band = deriveBpgvBandFromOrsAnswers({
      ...baseN7,
      'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
      'E4.N8.Q2': 'E4.N8.Q2.A',
      'E4.N8.Q9': 'E4.N8.Q9.B'
    })
    expect(band).toBe(BPGV_VARIANT_MINIMAL)
  })
})
