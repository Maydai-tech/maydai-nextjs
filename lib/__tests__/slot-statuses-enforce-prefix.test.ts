import { enforceStatusPrefix } from '@/lib/slot-statuses'

describe('enforceStatusPrefix — legacy Hors périmètre', () => {
  test('strip préfixe legacy et force Information insuffisante', () => {
    const out = enforceStatusPrefix(
      'Hors périmètre : Aucune donnée sur le registre. Références : Art. 16.',
      'Information insuffisante'
    )
    expect(out.startsWith('Information insuffisante : ')).toBe(true)
    expect(out).toContain('Aucune donnée sur le registre')
    expect(out).not.toContain('Hors périmètre')
  })
})
