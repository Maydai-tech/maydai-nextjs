import { formatEquivalence } from '../format-equivalence'

describe('formatEquivalence', () => {
  describe('recharge', () => {
    test('affiche un pourcentage de batterie si valeur < 1', () => {
      expect(formatEquivalence(0.0639, 'recharge')).toEqual({
        value: '6.4',
        unit: '% de batterie',
      })
    })

    test('affiche des recharges complètes si valeur >= 1', () => {
      expect(formatEquivalence(1.2, 'recharge')).toEqual({
        value: '1.2',
        unit: 'recharges complètes',
      })
    })
  })

  describe('minutes', () => {
    test('affiche des secondes si valeur < 1 minute', () => {
      expect(formatEquivalence(0.122, 'minutes')).toEqual({
        value: '7',
        unit: 'secondes',
      })
    })

    test('affiche des minutes si valeur >= 1', () => {
      expect(formatEquivalence(5.11, 'minutes')).toEqual({
        value: '5.1',
        unit: 'minutes',
      })
    })
  })
})
