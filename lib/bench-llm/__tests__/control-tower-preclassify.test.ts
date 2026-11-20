import { preclassReferenceRefusals, preclassifyModels, type PreclassModel } from '../control-tower-preclassify'

function model(partial: Partial<PreclassModel> & Pick<PreclassModel, 'id' | 'provider' | 'modelName'>): PreclassModel {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    hasCard: false,
    usecases: 0,
    ...partial,
  }
}

describe('preclassifyModels', () => {
  test('garde la taille dans la famille GPT OSS', () => {
    const proposals = preclassifyModels([
      model({ id: 'oss-120', provider: 'OpenAI', modelName: 'GPT OSS 120B', createdAt: '2025-12-09T00:00:00.000Z' }),
      model({ id: 'oss-120-high', provider: 'OpenAI', modelName: 'GPT OSS 120B High', createdAt: '2026-07-11T00:00:00.000Z' }),
      model({ id: 'oss-20', provider: 'OpenAI', modelName: 'GPT OSS 20B', createdAt: '2025-12-09T00:00:00.000Z' }),
      model({ id: 'oss-20-high', provider: 'OpenAI', modelName: 'GPT OSS 20B High', createdAt: '2026-07-11T00:00:00.000Z' }),
    ])
    const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]))
    expect(byId.get('oss-120')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('oss-20')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('oss-120-high')).toMatchObject({
      lineType: 'Variante',
      precision: 'Réglage',
      referenceId: 'oss-120',
    })
    expect(byId.get('oss-20-high')?.referenceId).toBe('oss-20')
    expect(preclassReferenceRefusals(proposals)).toEqual([])
  })

  test('ne relie pas entre elles les tailles Qwen2.5', () => {
    const proposals = preclassifyModels([
      model({ id: 'qwen-32', provider: 'Qwen', modelName: 'Qwen2.5 32B Instruct' }),
      model({ id: 'qwen-72', provider: 'Qwen', modelName: 'Qwen2.5 72B Instruct' }),
    ])
    expect(proposals).toEqual([
      expect.objectContaining({ id: 'qwen-32', lineType: 'Modèle', referenceId: null, action: '' }),
      expect.objectContaining({ id: 'qwen-72', lineType: 'Modèle', referenceId: null, action: '' }),
    ])
    expect(preclassReferenceRefusals(proposals)).toEqual([])
  })

  test('classe Ministral 3 par taille, avec l’Instruct comme modèle', () => {
    const proposals = preclassifyModels([
      model({ id: 'base-3', provider: 'Mistral', modelName: 'Ministral 3 (3B Base 2512)' }),
      model({ id: 'instruct-3', provider: 'Mistral', modelName: 'Ministral 3 (3B Instruct 2512)', createdAt: '2026-02-01T00:00:00.000Z' }),
      model({ id: 'reasoning-3', provider: 'Mistral', modelName: 'Ministral 3 (3B Reasoning 2512)' }),
      model({ id: 'instruct-14-old', provider: 'Mistral', modelName: 'Ministral 3 (14B Instruct 2512)', createdAt: '2026-01-01T00:00:00.000Z', hasCard: true }),
      model({ id: 'instruct-14-new', provider: 'Mistral', modelName: 'MiniStral 3 (14B Instruct 2512)', createdAt: '2026-03-01T00:00:00.000Z' }),
      model({ id: 'reasoning-only', provider: 'Mistral', modelName: 'Ministral 3 (8B Reasoning 2512)' }),
    ])
    const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]))
    expect(byId.get('instruct-3')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('base-3')).toMatchObject({ lineType: 'Variante', precision: 'Stade', referenceId: 'instruct-3' })
    expect(byId.get('reasoning-3')).toMatchObject({ lineType: 'Variante', precision: 'Stade', referenceId: 'instruct-3' })
    expect(byId.get('instruct-14-old')).toMatchObject({ lineType: 'Modèle' })
    expect(byId.get('instruct-14-new')).toMatchObject({ lineType: 'Doublon', mergeId: 'instruct-14-old', referenceId: null })
    expect(byId.get('reasoning-only')).toMatchObject({ lineType: '', action: 'CLASSER', referenceId: null })
    expect(preclassReferenceRefusals(proposals)).toEqual([])
  })

  test('laisse chaque taille de Llama 3.1 Instruct comme modèle quand il n’y a pas de ligne sans suffixe', () => {
    const proposals = preclassifyModels([
      model({ id: 'llama-8', provider: 'Meta', modelName: 'Llama 3.1 8B Instruct' }),
      model({ id: 'llama-70', provider: 'Meta', modelName: 'Llama 3.1 70B Instruct' }),
      model({ id: 'llama-405', provider: 'Meta', modelName: 'Llama 3.1 405B Instruct' }),
      model({ id: 'llama-70-base', provider: 'Meta', modelName: 'Llama 3.1 70B', createdAt: '2025-01-01T00:00:00.000Z' }),
      model({ id: 'llama-70-fp8', provider: 'Meta', modelName: 'Llama 3.1 70B Instruct FP8' }),
    ])
    const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]))
    expect(byId.get('llama-8')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('llama-405')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('llama-70')?.referenceId).toBe('llama-70-base')
    expect(byId.get('llama-70-base')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('llama-70-fp8')).toMatchObject({ lineType: 'Variante', precision: 'Format', referenceId: 'llama-70-base' })
    expect(byId.get('llama-8')?.referenceId).not.toBe('llama-70')
    expect(preclassReferenceRefusals(proposals)).toEqual([])
  })

  test('réserve Medium au réglage OpenAI et classe Eagle, le format et l’instantané', () => {
    const proposals = preclassifyModels([
      model({ id: 'o3', provider: 'OpenAI', modelName: 'o3' }),
      model({ id: 'o3-medium', provider: 'OpenAI', modelName: 'o3 Medium' }),
      model({ id: 'magistral', provider: 'Mistral', modelName: 'Magistral Medium' }),
      model({ id: 'eagle', provider: 'Meta', modelName: 'Llama 3.1 Eagle' }),
      model({ id: 'snap', provider: 'OpenAI', modelName: 'o3 20240315' }),
    ])
    const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]))
    expect(byId.get('o3-medium')).toMatchObject({ lineType: 'Variante', precision: 'Réglage', referenceId: 'o3' })
    expect(byId.get('magistral')).toMatchObject({ lineType: 'Modèle', referenceId: null })
    expect(byId.get('eagle')).toMatchObject({ lineType: 'Hors champ', precision: 'Auxiliaire', referenceId: null })
    expect(byId.get('snap')).toMatchObject({ lineType: 'Variante', precision: 'Instantané', referenceId: 'o3' })
    const nonReasoning = preclassifyModels([
      model({ id: 'grok', provider: 'xAI', modelName: 'Grok-4 Fast Non-Reasoning' }),
      model({ id: 'deepseek', provider: 'DeepSeek', modelName: 'DeepSeek-V3.2 (Non-thinking)' }),
    ])
    expect(nonReasoning.map((proposal) => proposal.lineType)).toEqual(['Modèle', 'Modèle'])
  })
})
