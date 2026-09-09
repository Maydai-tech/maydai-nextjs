import {
  computeSystemCardPrefillBonus,
  isDeclarativeQuestionFullyValidated,
  applySystemCardBonusToScores,
} from '@/lib/system-card-score-bonus'
import { getTodoActionMappings } from '@/lib/todo-action-sync'

describe('isDeclarativeQuestionFullyValidated', () => {
  test('détecte E5.N9.Q4.A comme documentation technique complète', () => {
    expect(
      isDeclarativeQuestionFullyValidated(
        [{ question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A' }],
        'technical_documentation'
      )
    ).toBe(true)
  })

  test('reste faux si la réponse est encore négative', () => {
    expect(
      isDeclarativeQuestionFullyValidated(
        [{ question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B' }],
        'technical_documentation'
      )
    ).toBe(false)
  })
})

describe('computeSystemCardPrefillBonus', () => {
  const negativeDocQuestion = [{ question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B' }]
  const positiveDocQuestion = [{ question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A' }]

  test('attribue +1.5 si seul le préremplissage MaydAI est appliqué', () => {
    const bonus = computeSystemCardPrefillBonus(
      [
        {
          doc_type: 'technical_documentation',
          maydai_prefill_applied: true,
          user_completion_applied: false,
        },
      ],
      negativeDocQuestion
    )
    expect(bonus).toBe(1.5)
  })

  test('attribue +3 si les deux flags sont vrais mais la question n’est pas à 100 %', () => {
    const bonus = computeSystemCardPrefillBonus(
      [
        {
          doc_type: 'technical_documentation',
          maydai_prefill_applied: true,
          user_completion_applied: true,
        },
      ],
      negativeDocQuestion
    )
    expect(bonus).toBe(3)
  })

  test('n’ajoute rien si la question est déjà validée à 100 %', () => {
    const bonus = computeSystemCardPrefillBonus(
      [
        {
          doc_type: 'technical_documentation',
          maydai_prefill_applied: true,
          user_completion_applied: true,
        },
      ],
      positiveDocQuestion
    )
    expect(bonus).toBe(0)
  })

  test('ignore les documents hors piliers System Card', () => {
    const bonus = computeSystemCardPrefillBonus(
      [
        {
          doc_type: 'human_oversight',
          maydai_prefill_applied: true,
          user_completion_applied: true,
        },
      ],
      [{ question_code: 'E5.N9.Q8', single_value: 'E5.N9.Q8.A' }]
    )
    expect(bonus).toBe(0)
  })

  test('calcule 50 % des points réels de l’action (mapping todo)', () => {
    const mappings = getTodoActionMappings('technical_documentation')
    const expectedHalf =
      mappings.reduce((sum, m) => sum + (m.expectedPointsGained || 0), 0) / 2
    const bonus = computeSystemCardPrefillBonus(
      [
        {
          doc_type: 'technical_documentation',
          maydai_prefill_applied: true,
          user_completion_applied: false,
        },
      ],
      negativeDocQuestion
    )
    expect(bonus).toBe(expectedHalf)
    expect(bonus).toBeGreaterThan(0)
  })
})

describe('applySystemCardBonusToScores', () => {
  test('fait passer un score_final de 40 à 41.5 pour un préremplissage MaydAI', () => {
    const result = applySystemCardBonusToScores({
      scoreBase: 23,
      scoreFinal: 40,
      bonus: 1.5,
      theoreticalMaxFinal: 93,
    })
    expect(result.scoreBase).toBe(23)
    expect(result.scoreFinal).toBe(41.5)
  })

  test('plafonne le score_final au maximum théorique', () => {
    const result = applySystemCardBonusToScores({
      scoreBase: 90,
      scoreFinal: 93,
      bonus: 1.5,
      theoreticalMaxFinal: 93,
    })
    expect(result.scoreBase).toBe(90)
    expect(result.scoreFinal).toBe(93)
  })
})
