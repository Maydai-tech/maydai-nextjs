import { compariaQueueCounts, compariaRowVisible } from '@/lib/comparia/reconcile-visibility'

function rows(count: number, linkStatus: 'unmatched' | 'matched' | 'ignored', isActive: boolean) {
  return Array.from({ length: count }, (_, index) => ({
    link_status: linkStatus,
    is_active: isActive,
    rank: index + 1,
    source_id: `${linkStatus}-${isActive ? 'actif' : 'archive'}-${index}`,
  }))
}

describe('visibilité de la file Compar:IA', () => {
  const catalog = [
    ...rows(16, 'unmatched', false),
    ...rows(115, 'matched', true),
    ...rows(12, 'matched', false),
    ...rows(13, 'ignored', true),
  ]

  test('compte toutes les lignes, y compris les archives CSV', () => {
    expect(compariaQueueCounts(catalog)).toEqual({ unmatched: 16, ignored: 13, matched: 127 })
  })

  test('le filtre par défaut À rapprocher renvoie les 16 lignes inactives', () => {
    const visible = catalog.filter((row) => compariaRowVisible(row, 'unmatched', 'all'))
    expect(visible).toHaveLength(16)
    expect(visible.every((row) => row.is_active === false)).toBe(true)
  })
})
