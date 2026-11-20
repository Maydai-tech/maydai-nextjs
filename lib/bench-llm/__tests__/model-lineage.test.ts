import { findCompariaHubLinks } from '@/lib/comparia/import'
import { planExactEcoLogitsLinks } from '@/lib/ecologits/sync'
import {
  followMergedModelId,
  partitionUniqueMoves,
  resolveAliasTargetId,
  sheetDriveCellsToCopy,
  systemCardReferenceMention,
  visibleModelsForQuery,
} from '@/lib/bench-llm/model-lineage'

describe('lignage et alias', () => {
  const models = [
    { id: 'variant', mergedIntoId: null, referenceModelId: 'base' },
    { id: 'absorbed', mergedIntoId: 'base', referenceModelId: null },
    { id: 'base', mergedIntoId: null, referenceModelId: null },
  ]

  test('suit merged_into_id jusqu’à la ligne absorbante', () => {
    const byId = new Map(models.map((model) => [model.id, model]))
    expect(followMergedModelId('absorbed', byId)).toBe('base')
  })

  test('retrouve un alias par source_id puis par nom normalisé', () => {
    const aliases = [{
      modelId: 'absorbed',
      source: 'comparia',
      sourceId: 'large-3-675b',
      normalizedName: 'mistrallarge3675b',
    }]
    expect(resolveAliasTargetId(aliases, models, {
      source: 'comparia',
      sourceId: 'large-3-675b',
      normalizedName: 'autre',
    })).toBe('base')
    expect(resolveAliasTargetId(aliases, models, {
      source: 'comparia',
      sourceId: 'inconnu',
      normalizedName: 'mistrallarge3675b',
    })).toBe('base')
  })

  test('la recherche d’une variante ramène la ligne visible', () => {
    const visible = [{ id: 'base', modelName: 'Mistral Large 3' }]
    const found = visibleModelsForQuery({
      visible,
      variants: [{ id: 'variant', modelName: 'Mistral Large 3 675B', referenceModelId: 'base' }],
      aliases: [],
      query: '675B',
    })
    expect(found.map((model) => model.id)).toEqual(['base'])
    expect(visibleModelsForQuery({ visible, variants: [], aliases: [], query: '' })).toEqual(visible)
  })

  test('une ligne base ne produit pas la mention de fiche', () => {
    expect(systemCardReferenceMention('Mistral Large 3', 'Mistral Large 3')).toBeNull()
    expect(systemCardReferenceMention('mistral-large-3-675b', 'Mistral Large 3')).toBe('Fiche de Mistral Large 3')
  })

  test('une fusion supprime le doublon d’unicité et déplace le reste', () => {
    const result = partitionUniqueMoves(
      [
        { id: 'dup', principle_id: 'p', benchmark_id: 'b', evaluation_date: '2026-01-01' },
        { id: 'keep', principle_id: 'p2', benchmark_id: 'b', evaluation_date: '2026-01-01' },
      ],
      [{ id: 'existing', principle_id: 'p', benchmark_id: 'b', evaluation_date: '2026-01-01' }],
      (row) => `${row.principle_id}|${row.benchmark_id}|${row.evaluation_date}`,
    )
    expect(result).toEqual({ updateIds: ['keep'], deleteIds: ['dup'] })
  })

  test('copie le lien de fichier seulement s’il est vide chez la ligne absorbante', () => {
    const headers = [
      'ID Supabase',
      'Lien du fichier Markdown généré',
      'Lien du dossier Drive cible',
    ]
    const absorbed = ['id-1', 'https://drive.example/fichier', 'https://drive.example/dossier']
    const absorber = ['id-2', '', 'https://drive.example/deja']
    expect(sheetDriveCellsToCopy(headers, absorbed, absorber)).toEqual([
      { header: 'Lien du fichier Markdown généré', value: 'https://drive.example/fichier' },
    ])
  })
})

describe('imports', () => {
  test('Compar:IA reconnaît un alias avant le nom du hub', () => {
    const links = findCompariaHubLinks(
      [{ source_id: 'large-3-675b' } as never],
      [{ id: 'base', model_name: 'Mistral Large 3', model_provider: 'Mistral', slug: 'mistral-large-3' }],
      [{
        modelId: 'absorbed',
        source: 'comparia',
        sourceId: 'large-3-675b',
        normalizedName: 'large-3-675b',
      }],
    )
    expect(links.get('large-3-675b')).toEqual({ modelId: 'absorbed', matchMethod: 'exact' })
  })

  test('EcoLogits reconnaît un alias et suit la fusion', () => {
    const links = planExactEcoLogitsLinks(
      [{ id: 'eco-1', provider: 'mistral', name: 'large-3-675b' }],
      [{ id: 'absorbed', model_name: 'doublon', model_provider: 'Mistral', merged_into_id: 'base' }],
      [],
      [{
        modelId: 'absorbed',
        source: 'ecologits',
        sourceId: 'eco-1',
        normalizedName: 'large3675b',
      }],
    )
    expect(links).toEqual([{
      ecologits_model_id: 'eco-1',
      maydai_model_id: 'base',
      match_method: 'exact',
    }])
  })
})
