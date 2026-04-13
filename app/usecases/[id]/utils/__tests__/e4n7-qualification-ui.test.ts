import { loadQuestions } from '../questions-loader'
import {
  assertE4N7GroupsCoverOptions,
  getE4N7CheckboxGroups,
  getE4N7StepCallout,
  getE4N7VisualSegment,
} from '../e4n7-qualification-ui'

describe('e4n7-qualification-ui', () => {
  const questions = loadQuestions()

  describe('getE4N7VisualSegment', () => {
    test('mappe les questions qualification', () => {
      expect(getE4N7VisualSegment('E4.N7.Q3')).toBe('prohibited-art5')
      expect(getE4N7VisualSegment('E4.N7.Q3.1')).toBe('prohibited-situations')
      expect(getE4N7VisualSegment('E4.N7.Q2.1')).toBe('ors-narrowing')
      expect(getE4N7VisualSegment('E4.N7.Q2')).toBe('annex-iii')
      expect(getE4N7VisualSegment('E4.N7.Q4')).toBeNull()
    })
  })

  describe('getE4N7StepCallout', () => {
    test('retourne des callouts pour Q2 et Q5 ; pas d’encart pour Q3, Q3.1 et Q2.1', () => {
      expect(getE4N7StepCallout('E4.N7.Q3')).toBeNull()
      expect(getE4N7StepCallout('E4.N7.Q3.1')).toBeNull()
      expect(getE4N7StepCallout('E4.N7.Q2.1')).toBeNull()
      expect(getE4N7StepCallout('E4.N7.Q2')?.variant).toBe('domains')
      expect(getE4N7StepCallout('E4.N7.Q5')?.variant).toBe('safeguard')
      expect(getE4N7StepCallout('E4.N8.Q9')).toBeNull()
    })
  })

  describe('groupes UX vs JSON', () => {
    test('E4.N7.Q2 — couverture exacte des options', () => {
      const opts = questions['E4.N7.Q2'].options.map((o) => o.code)
      assertE4N7GroupsCoverOptions('E4.N7.Q2', opts)
    })
    test('E4.N7.Q3 — couverture exacte des options', () => {
      const opts = questions['E4.N7.Q3'].options.map((o) => o.code)
      assertE4N7GroupsCoverOptions('E4.N7.Q3', opts)
    })
    test('E4.N7.Q3.1 — couverture exacte des options', () => {
      const opts = questions['E4.N7.Q3.1'].options.map((o) => o.code)
      assertE4N7GroupsCoverOptions('E4.N7.Q3.1', opts)
    })
    test('E4.N7.Q2.1 — couverture exacte des options', () => {
      const opts = questions['E4.N7.Q2.1'].options.map((o) => o.code)
      assertE4N7GroupsCoverOptions('E4.N7.Q2.1', opts)
    })
    test('autre question → pas de groupes', () => {
      expect(getE4N7CheckboxGroups('E4.N7.Q4')).toBeNull()
    })
  })
})
