import { groupByStatus, matchesSearch, procurementStatus } from '../procurement-status'

const now = Date.parse('2026-11-18T12:00:00Z')

describe('procurementStatus', () => {
  test('ouvert avant la date limite, clôturé à partir de la date limite', () => {
    expect(procurementStatus('2026-11-18T12:00:01Z', now)).toBe('open')
    expect(procurementStatus('2026-11-18T12:00:00Z', now)).toBe('closed')
  })

  test('un ancien appel sans date limite reste ouvert', () => {
    expect(procurementStatus(null, now)).toBe('open')
    expect(procurementStatus(undefined, now)).toBe('open')
  })
})

describe('matchesSearch', () => {
  test('ignore la casse, les accents et les espaces', () => {
    expect(matchesSearch('  presELECTION ', 'Outil de présélection de CV')).toBe(true)
    expect(matchesSearch('dentaire', 'Outil de présélection de CV')).toBe(false)
  })

  test('une recherche vide correspond à tout et cherche dans chaque champ', () => {
    expect(matchesSearch('', 'Titre')).toBe(true)
    expect(matchesSearch('lumière', 'Titre', null, 'Clinique Lumière')).toBe(true)
  })
})

describe('groupByStatus', () => {
  test('trie les ouverts par échéance proche et les clôturés du plus récent au plus ancien', () => {
    const items = [
      { id: 'far', deadline_at: '2027-01-01T00:00:00Z' },
      { id: 'old', deadline_at: '2026-01-01T00:00:00Z' },
      { id: 'none', deadline_at: null },
      { id: 'soon', deadline_at: '2026-12-01T00:00:00Z' },
      { id: 'recent', deadline_at: '2026-11-01T00:00:00Z' },
    ]
    const { open, closed } = groupByStatus(items, now)
    expect(open.map((item) => item.id)).toEqual(['soon', 'far', 'none'])
    expect(closed.map((item) => item.id)).toEqual(['recent', 'old'])
  })
})
