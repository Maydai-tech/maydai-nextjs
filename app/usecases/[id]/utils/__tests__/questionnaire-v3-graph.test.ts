import {
  buildQuestionPathV3,
  collectV3ActiveQuestionCodes,
  computeV3UsecaseQuestionnaireFields,
  deriveBpgvBandFromOrsAnswersV3,
  getNextArt50SubquestionAfterE6N10Q1Long,
  getNextQuestionV3,
  getResumeQuestionIdV3,
  V3_FULL_ENTREPRISE_ID,
  V3_FULL_TRANSPARENCE_ID,
  V3_FULL_USAGE_ID,
  V3_PRODUCT_SYSTEM_TYPE,
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
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

  it('Q10 absente sur branche texte seule (après T1) sans média : après ORS → E5.N9.Q5 (long) ou pack court', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.A',
    }
    /** Après ORS : parcours long → `E4.N8.Q12` (littératie) puis `E5.N9.Q5` ; court → `E5.N9.Q5` puis pack entreprise. */
    expect(getNextQuestionV3('E4.N8.Q11.T1', a, null, 'long')).toBe('E4.N8.Q12')
    expect(getNextQuestionV3('E4.N8.Q11.T1', a, null, 'short')).toBe('E5.N9.Q5')
    const codes = collectV3ActiveQuestionCodes(a, null)
    expect(codes).not.toContain('E4.N8.Q10')
    expect(codes).not.toContain('E4.N8.Q11.T1E')
    expect(codes).not.toContain('E4.N8.Q11.T2')
  })

  it('après `E5.N9.Q1` (parcours long) : enchaînement vers l’écran registre `E5.N9.Q7`', () => {
    expect(getNextQuestionV3('E5.N9.Q1', {}, null, 'long')).toBe('E5.N9.Q7')
  })

  it('après `E5.N9.Q7` (parcours long) : enchaînement direct vers `E5.N9.Q4` (sans checklist `V3_FULL_ENTREPRISE`)', () => {
    expect(getNextQuestionV3('E5.N9.Q7', {}, null, 'long')).toBe('E5.N9.Q4')
  })

  it('écran `E5.N9.Q7` : pas d’enchaînement en parcours court (écran dédié réservé au long)', () => {
    expect(getNextQuestionV3('E5.N9.Q7', {}, null, 'short')).toBeNull()
  })

  it('après `V3_FULL_ENTREPRISE` (parcours long) : enchaînement vers `E5.N9.Q4`', () => {
    expect(getNextQuestionV3(V3_FULL_ENTREPRISE_ID, {}, null, 'long')).toBe('E5.N9.Q4')
  })

  it('après `E5.N9.Q4` (parcours long) : enchaînement direct vers `E5.N9.Q8` (sans pack `V3_FULL_USAGE`)', () => {
    expect(getNextQuestionV3('E5.N9.Q4', {}, null, 'long')).toBe('E5.N9.Q8')
  })

  it('après `V3_FULL_USAGE` (parcours long) : enchaînement vers l’écran `E5.N9.Q8`', () => {
    expect(getNextQuestionV3(V3_FULL_USAGE_ID, {}, null, 'long')).toBe('E5.N9.Q8')
  })

  it('parcours court : pas d’accès au pack `V3_FULL_USAGE` (suivant null)', () => {
    expect(getNextQuestionV3(V3_FULL_USAGE_ID, {}, null, 'short')).toBeNull()
  })

  it('après `E5.N9.Q8` (parcours long) : enchaînement vers cybersécurité / robustesse `E5.N9.Q9`', () => {
    expect(getNextQuestionV3('E5.N9.Q8', {}, null, 'long')).toBe('E5.N9.Q9')
  })

  it('après `E5.N9.Q9` (parcours long) : enchaînement vers atténuation / prompts `E5.N9.Q3`', () => {
    expect(getNextQuestionV3('E5.N9.Q9', {}, null, 'long')).toBe('E5.N9.Q3')
  })

  it('après `E5.N9.Q3` (parcours long) : enchaînement vers transparence interaction `E6.N10.Q1`', () => {
    expect(getNextQuestionV3('E5.N9.Q3', {}, null, 'long')).toBe('E6.N10.Q1')
  })

  it('après `E6.N10.Q1` (parcours long, sans `E4.N7.Q1`) : défaut déployeur → `E6.N10.Q3`', () => {
    expect(getNextQuestionV3('E6.N10.Q1', {}, null, 'long')).toBe('E6.N10.Q3')
  })

  it('après `E6.N10.Q1` : déployeur → `E6.N10.Q3` (étiquetage visible Art. 50.4)', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A', 'E4.N8.Q11.1.B'],
    }
    expect(getNextQuestionV3('E6.N10.Q1', a, null, 'long')).toBe('E6.N10.Q3')
  })

  it('après `E6.N10.Q1` : fournisseur → `E6.N10.Q2` (marquage technique Art. 50.2)', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.A',
      'E4.N7.Q1.1': 'E4.N7.Q1.1.E',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.B'],
    }
    expect(getNextQuestionV3('E6.N10.Q1', a, null, 'long')).toBe('E6.N10.Q2')
  })

  it('après `E6.N10.Q1` : intégrateur (Q1.C) → `E6.N10.Q2`', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.C',
      'E4.N7.Q1.1': 'E4.N7.Q1.1.E',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
    }
    expect(getNextQuestionV3('E6.N10.Q1', a, null, 'long')).toBe('E6.N10.Q2')
  })

  it('après `E6.N10.Q1` : fournisseur même sans génération déclarée (Q11.0 non) → `E6.N10.Q2`', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.A',
      'E4.N7.Q1.1': 'E4.N7.Q1.1.E',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
    }
    expect(getNextQuestionV3('E6.N10.Q1', a, null, 'long')).toBe('E6.N10.Q2')
  })

  it('après `E6.N10.Q2` (parcours long) : fin de questionnaire (sans pack `V3_FULL_TRANSPARENCE`)', () => {
    expect(getNextQuestionV3('E6.N10.Q2', {}, null, 'long')).toBeNull()
  })

  it('après `E6.N10.Q3` (parcours long) : fin de questionnaire (sans pack `V3_FULL_TRANSPARENCE`)', () => {
    expect(getNextQuestionV3('E6.N10.Q3', {}, null, 'long')).toBeNull()
  })

  it('écran `E6.N10.Q2` : pas d’enchaînement en parcours court', () => {
    expect(getNextQuestionV3('E6.N10.Q2', {}, null, 'short')).toBeNull()
  })

  it('écran `E6.N10.Q3` : pas d’enchaînement en parcours court', () => {
    expect(getNextQuestionV3('E6.N10.Q3', {}, null, 'short')).toBeNull()
  })

  it('écran `E5.N9.Q9` : pas d’enchaînement en parcours court', () => {
    expect(getNextQuestionV3('E5.N9.Q9', {}, null, 'short')).toBeNull()
  })

  it('écran `E5.N9.Q3` : pas d’enchaînement en parcours court', () => {
    expect(getNextQuestionV3('E5.N9.Q3', {}, null, 'short')).toBeNull()
  })

  it('écran `E6.N10.Q1` : pas d’enchaînement en parcours court', () => {
    expect(getNextQuestionV3('E6.N10.Q1', {}, null, 'short')).toBeNull()
  })

  it('après `E5.N9.Q8` (parcours court) : pas d’enchaînement depuis l’écran dédié', () => {
    expect(getNextQuestionV3('E5.N9.Q8', {}, null, 'short')).toBeNull()
  })

  it('après `V3_FULL_TRANSPARENCE` (parcours long) : aligné sur getNextAfterQ12 (long → null)', () => {
    expect(getNextQuestionV3(V3_FULL_TRANSPARENCE_ID, {}, null, 'long')).toBeNull()
  })

  it('après Q10 : long → `E4.N8.Q12` puis `E5.N9.Q5` ; court → `E5.N9.Q5` puis pack entreprise après Q5', () => {
    const a = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
    }
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'long')).toBe('E4.N8.Q12')
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'long')).toBe('E5.N9.Q5')
    expect(getNextQuestionV3('E4.N8.Q10', a, null, 'short')).toBe('E5.N9.Q5')
    expect(getNextQuestionV3('E5.N9.Q5', a, null, 'long')).toBe('E5.N9.Q6')
    expect(getNextQuestionV3('E5.N9.Q5', a, null, 'short')).toBe(V3_SHORT_ENTREPRISE_ID)
    expect(getNextQuestionV3('E5.N9.Q6', a, null, 'long')).toBe('E5.N9.Q1')
    expect(getNextQuestionV3('E5.N9.Q1', a, null, 'long')).toBe('E5.N9.Q7')
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

})

describe('questionnaire-v3-graph — après E4.N8.Q12 (parcours long)', () => {
  const baseN8toE5 = {
    ...ctxOrsMinimal,
    'E4.N7.Q2': ['E4.N7.Q2.G'],
    'E4.N8.Q9': 'E4.N8.Q9.B',
    'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
    'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
    'E4.N8.Q10': 'E4.N8.Q10.A',
    'E5.N9.Q7': 'E5.N9.Q7.B',
  }

  it('parcours court : après Q12 → null (fin graphe)', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.A',
      'E4.N8.Q12': 'E4.N8.Q12.A',
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'short')).toBeNull()
  })

  it('parcours long : après Q12 → premier écran E5 (`E5.N9.Q5`)', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.A',
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'long')).toBe('E5.N9.Q5')
  })

  it('parcours long (variante Q11) : après Q12 → `E5.N9.Q5` ; fourche E6 inchangée', () => {
    const a = {
      ...baseN8toE5,
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
    }
    expect(getNextQuestionV3('E4.N8.Q12', a, null, 'long')).toBe('E5.N9.Q5')
    expect(getNextQuestionV3('E6.N10.Q1', a, null, 'long')).toBe('E6.N10.Q3')
  })

  it('parcours long (Q11.0 = non) : après Q12 → `E5.N9.Q5`', () => {
    expect(getNextQuestionV3('E4.N8.Q12', baseN8toE5, null, 'long')).toBe('E5.N9.Q5')
  })
})

describe('questionnaire-v3-graph — fourche Art. 50 après `E6.N10.Q1` (long)', () => {
  it('sans `E4.N7.Q1` : défaut → `E6.N10.Q3`', () => {
    expect(getNextArt50SubquestionAfterE6N10Q1Long({})).toBe('E6.N10.Q3')
  })

  it('déployeur (`E4.N7.Q1.B`) → `E6.N10.Q3`', () => {
    expect(getNextArt50SubquestionAfterE6N10Q1Long({ ...ctxOrsMinimal, 'E4.N7.Q1': 'E4.N7.Q1.B' })).toBe('E6.N10.Q3')
  })

  it('fournisseur (`E4.N7.Q1.A`) → `E6.N10.Q2`', () => {
    expect(getNextArt50SubquestionAfterE6N10Q1Long({ ...ctxOrsMinimal, 'E4.N7.Q1': 'E4.N7.Q1.A' })).toBe('E6.N10.Q2')
  })

  it('intégrateur (`E4.N7.Q1.C`) → `E6.N10.Q2`', () => {
    expect(getNextArt50SubquestionAfterE6N10Q1Long({ ...ctxOrsMinimal, 'E4.N7.Q1': 'E4.N7.Q1.C' })).toBe('E6.N10.Q2')
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
    if (Array.isArray(answer)) {
      if (
        questionId === V3_FULL_ENTREPRISE_ID ||
        questionId === V3_FULL_USAGE_ID ||
        questionId === V3_FULL_TRANSPARENCE_ID ||
        questionId === V3_SHORT_ENTREPRISE_ID ||
        questionId === V3_SHORT_USAGE_ID ||
        questionId === V3_SHORT_TRANSPARENCE_ID ||
        questionId === 'V3._SHORT_CONSOLIDATED'
      ) {
        return true
      }
      return answer.length > 0
    }
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

  it('reprise long : après Q10, premier trou sur littératie IA (`E4.N8.Q12`)', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E4.N8.Q12')
  })

  it('reprise long : après `E5.N9.Q5` et `E5.N9.Q6` complétés, premier trou sur gestion des risques (E5.N9.Q1)', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q1')
  })

  it('reprise long : après `E5.N9.Q1` complété, premier trou sur le registre `E5.N9.Q7`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q7')
  })

  it('reprise long : après `E5.N9.Q7` complété, premier trou sur `E5.N9.Q4` (sans étape `V3_FULL_ENTREPRISE`)', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q4')
  })

  it('reprise long : après `E4.N8.Q12` complété, premier trou sur `E5.N9.Q5` si `E5.N9.Q5` absent', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q5')
  })

  it('reprise long : après `E5.N9.Q4` complété, premier trou sur `E5.N9.Q8` (sans pack `V3_FULL_USAGE`)', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q8')
  })

  it('reprise long : après `E5.N9.Q4` complété, brouillon avec ancien pack `V3_FULL_USAGE` : premier trou sur `E5.N9.Q8`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      [V3_FULL_USAGE_ID]: [],
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q8')
  })

  it('reprise long : après `E5.N9.Q8` complété, premier trou sur `E5.N9.Q9`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q9')
  })

  it('reprise long : après `E5.N9.Q9` complété, premier trou sur `E5.N9.Q3`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
      'E5.N9.Q9': 'E5.N9.Q9.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E5.N9.Q3')
  })

  it('reprise long : après `E5.N9.Q3` complété, premier trou sur `E6.N10.Q1`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
      'E5.N9.Q9': 'E5.N9.Q9.B',
      'E5.N9.Q3': 'E5.N9.Q3.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E6.N10.Q1')
  })

  it('reprise long : après `E6.N10.Q1` complété (déployeur), premier trou sur `E6.N10.Q3`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
      'E5.N9.Q9': 'E5.N9.Q9.B',
      'E5.N9.Q3': 'E5.N9.Q3.B',
      'E6.N10.Q1': 'E6.N10.Q1.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E6.N10.Q3')
  })

  it('reprise long : après `E6.N10.Q3` complété (déployeur), fin de questionnaire — reprise sur `E6.N10.Q3` (sans pack `V3_FULL_TRANSPARENCE`)', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
      'E5.N9.Q9': 'E5.N9.Q9.B',
      'E5.N9.Q3': 'E5.N9.Q3.B',
      'E6.N10.Q1': 'E6.N10.Q1.B',
      'E6.N10.Q3': 'E6.N10.Q3.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E6.N10.Q3')
  })

  it('reprise long : après `E6.N10.Q1` complété (fournisseur), premier trou sur `E6.N10.Q2`', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q1': 'E4.N7.Q1.A',
      'E4.N7.Q1.1': 'E4.N7.Q1.1.E',
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.A',
      'E4.N8.Q11.1': ['E4.N8.Q11.1.A'],
      'E4.N8.Q11.T1': 'E4.N8.Q11.T1.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q6': 'E5.N9.Q6.B',
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
      'E5.N9.Q8': 'E5.N9.Q8.B',
      'E5.N9.Q9': 'E5.N9.Q9.B',
      'E5.N9.Q3': 'E5.N9.Q3.B',
      'E6.N10.Q1': 'E6.N10.Q1.B',
    }
    expect(getResumeQuestionIdV3(answers, null, isComplete, 'long')).toBe('E6.N10.Q2')
  })
})

describe('questionnaire-v3-graph — métadonnées use case', () => {
  it('ors_exit N8 complété lorsque N8 (hors Q10/Q12) et déclaration Q12 / BPGV touchés', () => {
    const answers = {
      ...ctxOrsMinimal,
      'E4.N7.Q2': ['E4.N7.Q2.G'],
      'E4.N8.Q9': 'E4.N8.Q9.B',
      'E4.N8.Q9.1': 'E4.N8.Q9.1.B',
      'E4.N8.Q11.0': 'E4.N8.Q11.0.B',
      'E4.N8.Q10': 'E4.N8.Q10.A',
      'E4.N8.Q12': 'E4.N8.Q12.B',
      'E5.N9.Q5': ['E5.N9.Q5.A'],
      'E5.N9.Q1': 'E5.N9.Q1.A',
      'E5.N9.Q7': 'E5.N9.Q7.B',
      'E5.N9.Q4': 'E5.N9.Q4.A',
    }
    const meta = computeV3UsecaseQuestionnaireFields(answers, null)
    expect(meta.ors_exit).toBe(ORS_EXIT_N8_COMPLETED)
    expect(meta.bpgv_variant).toBe(BPGV_VARIANT_MINIMAL)
  })
})
