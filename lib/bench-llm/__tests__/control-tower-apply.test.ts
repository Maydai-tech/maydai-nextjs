import { planControlTowerApply, type ControlTowerModelRef } from '../control-tower-apply'

const sonnet = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const base = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const other = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const models: ControlTowerModelRef[] = [
  { id: sonnet, slug: 'claude-sonnet', mergedIntoId: null },
  { id: base, slug: 'gpt-base', mergedIntoId: null },
  { id: other, slug: 'mistral-small', mergedIntoId: null },
]

function row(cells: Record<number, string>): string[] {
  const values = Array.from({ length: 27 }, () => '')
  for (const [index, value] of Object.entries(cells)) values[Number(index)] = value
  return values
}

describe('planControlTowerApply', () => {
  test('ignore une ligne sans source ni taxonomie, même si la ligne est courte', () => {
    const plan = planControlTowerApply({
      rows: [{ sheetRow: 2, cells: [sonnet, 'Anthropic'] }],
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows).toEqual([])
    expect(plan.rejectedValues).toEqual([])
  })

  test('mappe la veille quand X est rempli et accepte un slug pour W', () => {
    const plan = planControlTowerApply({
      rows: [{
        sheetRow: 4,
        cells: row({
          0: sonnet,
          6: 'Déprécié',
          19: '2024-10-22',
          20: '01/11/2026',
          22: 'gpt-base',
          23: 'https://example.com/status',
          24: '2026-11-16',
        }),
      }],
      models,
      today: '2026-11-16',
    })

    expect(plan.rejectedValues).toEqual([])
    expect(plan.modifiedRows).toEqual([{
      sheetRow: 4,
      modelId: sonnet,
      veille: {
        lifecycle_status: 'deprecated',
        launch_date: '2024-10-22',
        deprecation_date: '2026-11-01',
        retirement_date: null,
        replacement_model_id: base,
        lifecycle_source_url: 'https://example.com/status',
        lifecycle_checked_at: '2026-11-16T00:00:00.000Z',
      },
      taxonomie: null,
      sheetStatus: null,
    }])
  })

  test('refuse une date invalide sans effacer les autres champs de veille', () => {
    const plan = planControlTowerApply({
      rows: [{
        sheetRow: 3,
        cells: row({
          0: sonnet,
          6: 'Actif',
          19: '32/13/2026',
          23: 'https://example.com/status',
        }),
      }],
      models,
      today: '2026-11-16',
    })

    expect(plan.rejectedValues).toEqual([{
      sheetRow: 3,
      modelId: sonnet,
      column: 'T',
      value: '32/13/2026',
      reason: 'date invalide',
    }])
    expect(plan.modifiedRows[0]?.veille).toMatchObject({
      lifecycle_status: 'active',
      lifecycle_source_url: 'https://example.com/status',
    })
    expect(plan.modifiedRows[0]?.veille).not.toHaveProperty('launch_date')
  })

  test('prépare la taxonomie pour S = Oui et résout un UUID', () => {
    const plan = planControlTowerApply({
      rows: [{
        sheetRow: 8,
        cells: row({
          0: sonnet,
          14: base,
          15: 'version',
          16: 'gpt-base',
          18: 'Oui',
        }),
      }],
      models,
      today: '2026-11-16',
    })

    expect(plan.rejectedValues).toEqual([])
    expect(plan.modifiedRows[0]).toMatchObject({
      taxonomie: {
        role: 'version',
        reference_model_id: base,
        merged_into_id: null,
        base_model_id: base,
      },
      sheetStatus: 'Appliquée le 2026-11-16',
    })
  })

  test('refuse un rôle hors liste et n’écrit pas le statut Appliquée', () => {
    const plan = planControlTowerApply({
      rows: [{
        sheetRow: 5,
        cells: row({ 0: sonnet, 15: 'champion', 18: 'oui' }),
      }],
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows).toEqual([])
    expect(plan.rejectedValues).toEqual([{
      sheetRow: 5,
      modelId: sonnet,
      column: 'P',
      value: 'champion',
      reason: 'rôle hors liste',
    }])
  })

  test('refuse une fusion circulaire', () => {
    const plan = planControlTowerApply({
      rows: [
        { sheetRow: 2, cells: row({ 0: sonnet, 17: base, 18: 'Oui' }) },
        { sheetRow: 3, cells: row({ 0: base, 17: 'claude-sonnet', 18: 'Oui' }) },
      ],
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows.filter((row) => row.taxonomie)).toEqual([])
    expect(plan.rejectedValues.map((rejection) => rejection.reason)).toEqual([
      'fusion circulaire',
      'fusion circulaire',
    ])
  })

  test('refuse un identifiant de ligne inconnu', () => {
    const plan = planControlTowerApply({
      rows: [{
        sheetRow: 9,
        cells: row({ 0: other.replace('c', 'd'), 23: 'https://example.com' }),
      }],
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows).toEqual([])
    expect(plan.rejectedValues[0]?.reason).toBe('ID inconnu')
  })
})
