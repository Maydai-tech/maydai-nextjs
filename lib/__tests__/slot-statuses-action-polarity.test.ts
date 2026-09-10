import { computeSlotStatuses } from '@/lib/slot-statuses'

/**
 * Polarité des slots action_* : « Oui » au questionnaire = mesure déclarée en place (OUI).
 * Régression du commit da117fd qui inversait action_1 / action_2 / action_3.
 *
 * Codes catalogue :
 * - E5.N9.Q1.A = Oui (gestion des risques)
 * - E5.N9.Q9.B = Oui (exactitude / robustesse / cybersécurité)
 * - E4.N8.Q12.B = Oui (littératie / formations AI Act)
 */
describe('slot-statuses — polarité action_1 / action_2 / action_3', () => {
  test('Oui questionnaire → slot OUI (mesure en place)', () => {
    const statuses = computeSlotStatuses([
      { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A' },
      { question_code: 'E5.N9.Q9', single_value: 'E5.N9.Q9.B' },
      { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B' },
    ])
    expect(statuses.action_1).toBe('OUI')
    expect(statuses.action_2).toBe('OUI')
    expect(statuses.action_3).toBe('OUI')
  })

  test('Non questionnaire → slot NON (mesure absente)', () => {
    const statuses = computeSlotStatuses([
      { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.B' },
      { question_code: 'E5.N9.Q9', single_value: 'E5.N9.Q9.A' },
      { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.A' },
    ])
    expect(statuses.action_1).toBe('NON')
    expect(statuses.action_2).toBe('NON')
    expect(statuses.action_3).toBe('NON')
  })
})
