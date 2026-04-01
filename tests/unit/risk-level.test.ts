import fixtures from '../fixtures/maydai-report-fixtures.json'
import {
  deriveRiskLevelFromResponses,
  type RiskLevelCode,
} from '@/lib/risk-level'

type Fixture = {
  id: string
  expectedRisk: RiskLevelCode
  answers: Array<{
    question_code: string
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
  }>
}

const typedFixtures = fixtures as unknown as Fixture[]

describe('lib/risk-level.ts — calcul autoritatif du risque', () => {
  test.each(typedFixtures)('$id', (fixture) => {
    const actual = deriveRiskLevelFromResponses(fixture.answers)
    expect(actual).toBe(fixture.expectedRisk)
  })

  test('priorité stricte: unacceptable > high > limited > minimal', () => {
    const minimalOnly = deriveRiskLevelFromResponses([
      { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.A' },
    ])
    expect(minimalOnly).toBe('minimal')

    const limitedOverMinimal = deriveRiskLevelFromResponses([
      { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.A' },
      { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' }, // limited
    ])
    expect(limitedOverMinimal).toBe('limited')

    const highOverLimited = deriveRiskLevelFromResponses([
      { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' }, // limited
      { question_code: 'E4.N7.Q2', multiple_codes: ['E4.N7.Q2.A'] }, // high
    ])
    expect(highOverLimited).toBe('high')

    const unacceptableOverHigh = deriveRiskLevelFromResponses([
      { question_code: 'E4.N7.Q2', multiple_codes: ['E4.N7.Q2.A'] }, // high
      { question_code: 'E4.N7.Q3', multiple_codes: ['E4.N7.Q3.A'] }, // unacceptable
    ])
    expect(unacceptableOverHigh).toBe('unacceptable')
  })
})

