import { formatImpactRange } from '../EcologitsAdminPage'

describe('EcologitsAdminPage formatters', () => {
  test('formats an EcoLogits interval with its unit', () => {
    expect(formatImpactRange(0.001, 0.002, 'kWh')).toContain('kWh')
    expect(formatImpactRange(0.001, 0.002, 'kWh')).toContain('–')
  })

  test('shows a fallback when the estimate is missing', () => {
    expect(formatImpactRange(null, null, null)).toBe('Non disponible')
  })
})
