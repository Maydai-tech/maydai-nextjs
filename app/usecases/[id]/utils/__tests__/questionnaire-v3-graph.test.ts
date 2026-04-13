import {
  buildQuestionPathV3,
  collectV3ActiveQuestionCodes,
  computeV3UsecaseQuestionnaireFields,
  deriveBpgvBandFromOrsAnswersV3,
  getFirstE5AfterOrsV3,
  getNextQuestionV3,
  getResumeQuestionIdV3,
  V3_PRODUCT_SYSTEM_TYPE,
} from '../questionnaire-v3-graph'
import {
  BPGV_VARIANT_HIGH,
  BPGV_VARIANT_LIMITED,
  BPGV_VARIANT_MINIMAL,
  ORS_EXIT_N8_COMPLETED,
} from '@/lib/questionnaire-version'
import { V3_ANNEX1_JNS } from '@/lib/qualification-v3-decision'

/** Contexte ORS minimal (aucune interdiction, Q3.1 « aucune situation »). */
const ctxOrsMinimal = {
  'E4.N7.Q1': 'E4.N7.Q1.B',
  'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
} as Record<string, unknown>

describe('questionnaire-v3-graph — Annexe I (Q4) & type de système', () => {
  it('cas produit : après Q2.1 enchaîne vers E4.N7.Q4 (Annexe I)', () => {
    expect(getNextQuestionV3('E4.N7.Q2.1', ctxOrsMinimal, V3_PRODUCT_SYSTEM_TYPE)).toBe('E4.N7.Q4')
  })

  it('cas non-produit : après Q2.1 enchaîne vers E4.N7.Q2 sans passer par Q4', () => {
    expect(getNextQuestionV3('E4.N7.Q2.1', ctxOrsMinimal, 'Système autonome')).toBe('E4.N7.Q2')
    expect(getNextQuestionV3('E4.N7.Q2.1', ctxOrsMinimal, null)).toBe('E4.N7.Q2')
  })

  it('active_question_codes contient Q4 seulement sur parcours produit avec réponse Q4', () => {
    const withQ4 = {
      ...ctxOrsMinimal,
      'E4.N7.Q4': 'E4.N7.Q4.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
    }
    const productCodes = collectV3ActiveQuestionCodes(withQ4, V3_PRODUCT_SYSTEM_TYPE)
    expect(productCodes).toContain('E4.N7.Q4')

    const noProductCodes = collectV3ActiveQuestionCodes(
      { ...ctxOrsMinimal, 'E4.N7.Q2': ['E4.N7.Q2.G'] },
      null
    )
    expect(noProductCodes).not.toContain('E4.N7.Q4')
  })

  it('Annexe I « Je ne sais pas » : le graphe continue vers E4.N7.Q2 (l’impossibilité métier est dans resolveQualificationOutcomeV3)', () => {
    const jns = { ...ctxOrsMinimal, 'E4.N7.Q4': V3_ANNEX1_JNS }
    expect(getNextQuestionV3('E4.N7.Q4', jns, V3_PRODUCT_SYSTEM_TYPE)).toBe('E4.N7.Q2')
    const codes = collectV3ActiveQuestionCodes(jns, V3_PRODUCT_SYSTEM_TYPE)
    expect(codes).toContain('E4.N7.Q4')
    expect(codes[codes.length - 1]).toBe('E4.N7.Q2')
  })
})

describe('questionnaire-v3-graph — séquence N8 (Q9.1, Q10, Q12)', () => {
  it('après Q9 toujours Q9.1 (conservation biométrie / émotions)', () => {
    expect(getNextQuestionV3('E4.N8.Q9', {}, null)).toBe('E4.N8.Q9.1')
  })

  it('Q10 absente sur branche texte seule (après T1) sans média : saut direct vers E5', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
    }
    /** T1.A élève la bande ORS → première E5 = Q1 (pas Q7 minimal). */
    expect(getNextQuestionV3('E4.N8.Q11.T1', a, null)).toBe('E5.N9.Q1')
    const codes = collectV3ActiveQuestionCodes(a, null)
    expect(codes).not.toContain('E4.N8.Q10')
    expect(codes).not.toContain('E4.N8.Q11.T1E')
    expect(codes).not.toContain('E4.N8.Q11.T2')
  })

  it('T1.A : bande ORS au moins limited (transparence texte)', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
    }
    expect(deriveBpgvBandFromOrsAnswersV3(a)).toBe(BPGV_VARIANT_LIMITED)
  })

  it('Q10 présente après M2 (deepfake oui puis sous-branche M2)', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.B'],
      'E4.N8.Q11.M1': 'E4.N8.Q11.M1.A',
      'E4.N8.Q11.M2': 'E4.N8.Q11.M2.A',
    }
    expect(getNextQuestionV3('E4.N8.Q11.M2', a, null)).toBe('E4.N8.Q10')
  })

  it('Q11.0.B mène à E4.N8.Q10 avant le bloc E5 (hors cœur qualification mais dans le parcours)', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
    }
    expect(getNextQuestionV3('E4.N8.Q11.0', a, null)).toBe('E4.N8.Q10')
    const path = buildQuestionPathV3('E4.N8.Q10', a, null)
    expect(path).toContain('E4.N8.Q9.1')
    expect(path).toContain('E4.N8.Q10')
    expect(path.indexOf('E4.N8.Q9.1')).toBeLessThan(path.indexOf('E4.N8.Q10'))
  })

  it('première question E5 : toujours E5.N9.Q1 après ORS (parcours long)', () => {
    expect(getFirstE5AfterOrsV3({})).toBe('E5.N9.Q1')
    expect(getFirstE5AfterOrsV3({ 'E4.N8.Q9': 'E4.N8.Q9.A' })).toBe('E5.N9.Q1')
  })
})

describe('questionnaire-v3-graph — E6 après Q12', () => {
  const baseN8toE5 = {
    ...ctxOrsMinimal,
    'E4.N7.Q2': ['E4.N7.Q2.G'],
    'E4.N8.Q9': 'E4.N8.Q9.B',
    'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
    'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
    'E4.N8.Q10': 'E4.N8.Q10.A',
    'E5.N9.Q7': { selected: 'E5.N9.Q7.B', conditionalValues: {} },
  }

  it('parcours court : après Q12 → null (pas E6)', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.A',
      'E4.N8.Q12': 'E4.N8.Q12.A',
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBeNull()
  })

  it('Q9 = interaction oui : après Q12 → E6.N10.Q1', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.A',
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null)).toBe('E6.N10.Q1')
  })

  it('Q9 = non, Q11.0 = oui : après Q12 → E6.N10.Q1 puis Q2', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E5.N9.Q7': { selected: 'E5.N9.Q7.B', conditionalValues: {} },
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null)).toBe('E6.N10.Q1')
    expect(getNextQuestionV3('E6.N10.Q1', a, null)).toBe('E6.N10.Q2')
  })

  it('Q9 = non, Q11.0 = non : après Q12 → E6.N10.Q1 (bloc transparence obligatoire)', () => {
    expect(getNextQuestionV3('E4.N8.Q12', baseN8toE5, null)).toBe('E6.N10.Q1')
  })
})

describe('questionnaire-v3-graph — garde-fou 6.3 & bande BPGV', () => {
  it('Q5.A + domaine sensible : Q2 exclue du calcul de bande (pas de high « domaine seul »)', () => {
    const band = deriveBpgvBandFromOrsAnswersV3({
      'E4.N7.Q2': ['E4.N7.Q2.A'],
      'E4.N7.Q5': 'E4.N7.Q5.A',
      'E4.N8.Q9': 'E4.N8.Q9.B',
    })
    expect(band).toBe(BPGV_VARIANT_MINIMAL)
  })

  it('Q5.B + domaine sensible : bande reflète le high du domaine', () => {
    const band = deriveBpgvBandFromOrsAnswersV3({
      'E4.N7.Q2': ['E4.N7.Q2.A'],
      'E4.N7.Q5': 'E4.N7.Q5.B',
      'E4.N8.Q9': 'E4.N8.Q9.B',
    })
    expect(band).toBe(BPGV_VARIANT_HIGH)
  })
})

describe('questionnaire-v3-graph — reprise (resume)', () => {
  const isComplete = (questionId: string, answer: unknown): boolean => {
    if (answer === undefined || answer === null) return false
    if (typeof answer === 'string') return answer.length > 0
    if (Array.isArray(answer)) return answer.length > 0
    return true
  }

  it('reprise après Q4 (y compris JNS) : la suite graphe est Q2 — reprise sur Q2 si non renseignée', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q4': V3_ANNEX1_JNS,
    }
    expect(getResumeQuestionIdV3(answers, V3_PRODUCT_SYSTEM_TYPE, isComplete)).toBe('E4.N7.Q2')
  })

  it('reprise sur parcours produit incomplet : première question sans réponse complète', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q4': 'E4.N7.Q4.A',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
    }
    expect(getResumeQuestionIdV3(answers, V3_PRODUCT_SYSTEM_TYPE, isComplete)).toBe('E4.N8.Q9.1')
  })
})

describe('questionnaire-v3-graph — métadonnées use case', () => {
  it('ors_exit N8 complété lorsque N8 (hors Q10/Q12) et BPGV touchés', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E5.N9.Q7': { selected: 'E5.N9.Q7.B', conditionalValues: {} },
    }
    const meta = computeV3UsecaseQuestionnaireFields(answers, null)
    expect(meta.ors_exit).toBe(ORS_EXIT_N8_COMPLETED)
    expect(meta.bpgv_variant).toBe(BPGV_VARIANT_MINIMAL)
  })
})
