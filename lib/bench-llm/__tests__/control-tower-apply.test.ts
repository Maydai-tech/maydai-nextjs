import { planControlTowerApply, type ControlTowerModelRef } from '../control-tower-apply'

const sonnet = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const base = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const other = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const LEGACY_HEADERS = [
  'ID Supabase',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  'Statut Supabase',
  'Statut Fiche Technique',
  'Statut LLM',
  'Lien du dossier Drive cible',
  'Lien du fichier Markdown généré',
  'Date de dernière mise à jour (Supabase)',
  "Date de priorisation de l'action",
  'Action requise par Hermes',
  'Prêt pour import',
  'Validation juridique',
  'Modèle de base',
  'Rôle',
  'Ligne de référence (ID)',
  'Fusionner avec (ID)',
  'Taxonomie validée',
  'Date de lancement',
  'Date de dépréciation',
  'Date de retrait',
  'Remplacé par (ID)',
  'Source du statut',
  'Dernière vérification',
  'Visible dans MaydAI',
  'Popularité',
]

const models: ControlTowerModelRef[] = [
  { id: sonnet, slug: 'claude-sonnet', modelName: 'Claude Sonnet', mergedIntoId: null, role: null, referenceModelId: null },
  { id: base, slug: 'gpt-base', modelName: 'GPT Base', mergedIntoId: null, role: 'base', referenceModelId: null },
  { id: other, slug: 'mistral-small', modelName: 'Mistral Small', mergedIntoId: null, role: 'base', referenceModelId: null },
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
      headers: LEGACY_HEADERS,
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
      headers: LEGACY_HEADERS,
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
      headers: LEGACY_HEADERS,
      models,
      today: '2026-11-16',
    })

    expect(plan.rejectedValues).toEqual([{
      sheetRow: 3,
      modelId: sonnet,
      column: 'Date de lancement',
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
      headers: LEGACY_HEADERS,
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
      headers: LEGACY_HEADERS,
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows).toEqual([])
    expect(plan.rejectedValues).toEqual([{
      sheetRow: 5,
      modelId: sonnet,
      column: 'Rôle',
      value: 'champion',
      reason: 'type de ligne hors liste',
    }])
  })

  test('refuse une fusion circulaire', () => {
    const plan = planControlTowerApply({
      rows: [
        { sheetRow: 2, cells: row({ 0: sonnet, 17: base, 18: 'Oui' }) },
        { sheetRow: 3, cells: row({ 0: base, 17: 'claude-sonnet', 18: 'Oui' }) },
      ],
      headers: LEGACY_HEADERS,
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
      headers: LEGACY_HEADERS,
      models,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows).toEqual([])
    expect(plan.rejectedValues[0]?.reason).toBe('ID inconnu')
  })

  test('convertit Type de ligne et Précision vers role, même si les colonnes ont changé de place', () => {
    const headers = [
      'Taxonomie validée',
      'Précision',
      'ID Supabase',
      'Type de ligne',
      'Ligne de référence (ID)',
      'Fusionner avec (ID)',
      'Modèle de base (ID)',
      'Statut LLM',
      'Date de lancement',
      'Date de dépréciation',
      'Date de retrait',
      'Remplacé par (ID)',
      'Source du statut',
      'Dernière vérification',
    ]
    const cells = headers.map((header) => ({
      'Taxonomie validée': 'Oui',
      'Précision': 'Stade',
      'ID Supabase': sonnet,
      'Type de ligne': 'Variante',
      'Ligne de référence (ID)': base,
    }[header] ?? ''))

    const plan = planControlTowerApply({
      headers,
      rows: [{ sheetRow: 4, cells }],
      models,
      today: '2026-11-16',
    })

    expect(plan.rejectedValues).toEqual([])
    expect(plan.modifiedRows[0]?.taxonomie).toMatchObject({
      role: 'stade',
      reference_model_id: base,
    })
  })

  test('refuse chaque référence interdite', () => {
    const variant = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    const small = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const large = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const chain = '99999999-9999-4999-8999-999999999999'
    const loop = 'abababab-abab-4aba-8aba-abababababab'
    const self = '12121212-1212-4121-8121-121212121212'
    const named: ControlTowerModelRef[] = [
      { id: variant, slug: 'gpt-oss-120b-high', modelName: 'GPT OSS 120B High', mergedIntoId: null, role: 'reglage', referenceModelId: null },
      { id: small, slug: 'gpt-oss-20b', modelName: 'GPT OSS 20B', mergedIntoId: null, role: 'base', referenceModelId: null },
      { id: large, slug: 'gpt-oss-120b', modelName: 'GPT OSS 120B', mergedIntoId: null, role: 'base', referenceModelId: chain },
      { id: chain, slug: 'gpt-oss-chain', modelName: 'GPT OSS 120B Chain', mergedIntoId: null, role: 'base', referenceModelId: null },
      { id: loop, slug: 'loop-target', modelName: 'Loop Target', mergedIntoId: null, role: 'base', referenceModelId: sonnet },
      { id: sonnet, slug: 'claude-sonnet', modelName: 'Claude Sonnet', mergedIntoId: null, role: null, referenceModelId: null },
      { id: self, slug: 'solo', modelName: 'Solo', mergedIntoId: null, role: 'base', referenceModelId: null },
    ]
    const cases = [
      { id: variant, reference: small, reason: 'la taille diffère de la ligne de référence' },
      { id: self, reference: self, reason: 'la ligne de référence est la ligne elle-même' },
      { id: sonnet, reference: variant, reason: "la ligne de référence n'est pas de type Modèle" },
      { id: variant, reference: large, reason: 'chaîne de lignes de référence' },
      { id: sonnet, reference: loop, reason: 'boucle de lignes de référence' },
    ]

    const plan = planControlTowerApply({
      headers: LEGACY_HEADERS,
      rows: cases.map((entry, index) => ({
        sheetRow: index + 2,
        cells: row({
          0: entry.id,
          15: 'stade',
          16: entry.reference,
          18: 'Oui',
        }),
      })),
      models: named,
      today: '2026-11-16',
    })

    expect(plan.modifiedRows.filter((entry) => entry.taxonomie)).toEqual([])
    expect(plan.rejectedValues.map((rejection) => rejection.reason)).toEqual(cases.map((entry) => entry.reason))
  })

  test('s’arrête si un en-tête attendu manque', () => {
    expect(() => planControlTowerApply({
      headers: ['ID Supabase'],
      rows: [],
      models,
      today: '2026-11-16',
    })).toThrow('En-tête manquant : « Statut LLM ». Aucune colonne n\'a été insérée.')
  })
})
