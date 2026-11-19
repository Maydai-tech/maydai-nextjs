import { getNextQuestion } from '../questionnaire'
import { QUESTIONNAIRE_VERSION_V1, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { V3_PRODUCT_SYSTEM_TYPE } from '@/lib/qualification-v3-decision'

const ctxOrsMinimal = {
  'E4.N7.Q1': 'E4.N7.Q1.B',
  'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
  'E4.N7.Q3': ['E4.N7.Q3.E'],
  'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
  'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
}

describe('questionnaire.ts — façade V3 vs V1 (non-régression)', () => {
  it('V3 + systemType Produit : délègue au graphe V3 (Q2.1 → Q4)', () => {
    const next = getNextQuestion('E4.N7.Q2.1', ctxOrsMinimal, QUESTIONNAIRE_VERSION_V3, {
      systemType: V3_PRODUCT_SYSTEM_TYPE,
    })
    expect(next).toBe('E4.N7.Q4')
  })

  it('V1 : après Q2.1 vers Q3 (inchangé, pas de Q4 produit)', () => {
    const next = getNextQuestion('E4.N7.Q2.1', ctxOrsMinimal, QUESTIONNAIRE_VERSION_V1)
    expect(next).toBe('E4.N7.Q3')
  })
})
