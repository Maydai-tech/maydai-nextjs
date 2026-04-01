import fixtures from '../fixtures/maydai-report-fixtures.json'
import { computeSlotStatuses, type SlotStatusMap, SLOT_KEYS } from '@/lib/slot-statuses'

type Fixture = {
  id: string
  description: string
  uiReachable: boolean
  answers: Array<{
    question_code: string
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
    conditional_keys?: string[] | null
    conditional_values?: string[] | null
  }>
  expectedRisk: string
  expectedSlots: SlotStatusMap
}

const typedFixtures = fixtures as unknown as Fixture[]

describe('lib/slot-statuses.ts — statuts déterministes des 9 slots', () => {
  test.each(typedFixtures)('$id', (fixture) => {
    const actual = computeSlotStatuses(fixture.answers)

    // Vérification stricte et lisible slot par slot
    for (const key of SLOT_KEYS) {
      expect(actual[key]).toBe(fixture.expectedSlots[key])
    }
  })
})

