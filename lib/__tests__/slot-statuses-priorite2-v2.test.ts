import { computeSlotStatuses } from '@/lib/slot-statuses'
import { QUESTIONNAIRE_VERSION_V2 } from '@/lib/questionnaire-version'

const V2 = QUESTIONNAIRE_VERSION_V2

describe('priorite_2 — parcours V2 (E6.N10.Q1 et/ou Q2 actifs)', () => {
  test('ni Q1 ni Q2 dans active_question_codes → Hors périmètre', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E4.N7.Q1'] }
    )
    expect(s.priorite_2).toBe('Hors périmètre')
  })

  test('seulement E6.N10.Q2 actif + réponse Oui → OUI (plus de faux Hors périmètre)', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.B' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E4.N8.Q12', 'E6.N10.Q2'] }
    )
    expect(s.priorite_2).toBe('OUI')
  })

  test('seulement E6.N10.Q2 actif + réponse Non → NON', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q2'] }
    )
    expect(s.priorite_2).toBe('NON')
  })

  test('seulement E6.N10.Q2 actif + pas de réponse exploitable → Information insuffisante', () => {
    const s = computeSlotStatuses([], {
      questionnaireVersion: V2,
      activeQuestionCodes: ['E6.N10.Q2'],
    })
    expect(s.priorite_2).toBe('Information insuffisante')
  })

  test('seulement E6.N10.Q1 actif + Oui → OUI', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q1'] }
    )
    expect(s.priorite_2).toBe('OUI')
  })

  test('seulement E6.N10.Q1 actif + Non → NON', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q1'] }
    )
    expect(s.priorite_2).toBe('NON')
  })

  test('Q1 et Q2 actifs, les deux Oui → OUI', () => {
    const s = computeSlotStatuses(
      [
        { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B' },
        { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.B' },
      ],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q1', 'E6.N10.Q2'] }
    )
    expect(s.priorite_2).toBe('OUI')
  })

  test('Q1 et Q2 actifs, au moins une Non → NON', () => {
    const s = computeSlotStatuses(
      [
        { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B' },
        { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' },
      ],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q1', 'E6.N10.Q2'] }
    )
    expect(s.priorite_2).toBe('NON')
  })

  test('Q1 et Q2 actifs, une réponse manquante → Information insuffisante', () => {
    const s = computeSlotStatuses(
      [{ question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B' }],
      { questionnaireVersion: V2, activeQuestionCodes: ['E6.N10.Q1', 'E6.N10.Q2'] }
    )
    expect(s.priorite_2).toBe('Information insuffisante')
  })
})

describe('priorite_2 — V1 inchangé (couple obligatoire sans active_question_codes)', () => {
  test('une seule réponse en base → Information insuffisante', () => {
    const s = computeSlotStatuses([
      { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' },
    ])
    expect(s.priorite_2).toBe('Information insuffisante')
  })
})
