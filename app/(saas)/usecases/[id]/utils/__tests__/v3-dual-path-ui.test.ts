import { QUESTIONNAIRE_VERSION_V1, QUESTIONNAIRE_VERSION_V2, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import { showV3DualPathEntrypoints } from '../v3-dual-path-ui'

describe('showV3DualPathEntrypoints', () => {
  test('true pour questionnaire V3 (y compris cas complété côté données)', () => {
    expect(showV3DualPathEntrypoints(QUESTIONNAIRE_VERSION_V3)).toBe(true)
    expect(showV3DualPathEntrypoints(3)).toBe(true)
  })

  test('false pour V1 et V2', () => {
    expect(showV3DualPathEntrypoints(QUESTIONNAIRE_VERSION_V1)).toBe(false)
    expect(showV3DualPathEntrypoints(QUESTIONNAIRE_VERSION_V2)).toBe(false)
    expect(showV3DualPathEntrypoints(2)).toBe(false)
  })

  test('false pour valeurs non reconnues (normalisées en V1)', () => {
    expect(showV3DualPathEntrypoints(null)).toBe(false)
    expect(showV3DualPathEntrypoints(undefined)).toBe(false)
    expect(showV3DualPathEntrypoints('3')).toBe(false)
  })
})
