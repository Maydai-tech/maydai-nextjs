import { suggestMaydaiModelForComparia, type MaydaiSuggestionModel } from '../suggestions'

function model(partial: Partial<MaydaiSuggestionModel> & Pick<MaydaiSuggestionModel, 'id' | 'model_name'>): MaydaiSuggestionModel {
  return {
    slug: partial.slug ?? partial.id,
    model_provider: partial.model_provider ?? null,
    short_name: partial.short_name ?? null,
    long_name: partial.long_name ?? null,
    variants: partial.variants ?? [],
    ...partial,
  }
}

const CLAUDE = [
  model({ id: 'sonnet-45', slug: 'claude-sonnet-4-5', model_name: 'Claude Sonnet 4.5', model_provider: 'Anthropic', short_name: 'Claude Sonnet 4.5' }),
  model({ id: 'sonnet-4', slug: 'claude-sonnet-4', model_name: 'Claude Sonnet 4', model_provider: 'Anthropic' }),
  model({ id: 'sonnet-5', slug: 'claude-sonnet-5', model_name: 'Claude Sonnet 5', model_provider: 'Anthropic' }),
  model({ id: 'sonnet-55', slug: 'claude-sonnet-5-5', model_name: 'Claude Sonnet 5.5', model_provider: 'Anthropic' }),
]

describe('suggestMaydaiModelForComparia', () => {
  test('réordonne les mots d’un même éditeur sans confondre la version mineure', () => {
    expect(suggestMaydaiModelForComparia(
      { source_id: 'claude-4-5-sonnet', organisation: 'Anthropic' },
      CLAUDE,
    )?.id).toBe('sonnet-45')
    expect(suggestMaydaiModelForComparia(
      { source_id: 'claude-5-sonnet', organisation: 'Anthropic' },
      CLAUDE,
    )?.id).toBe('sonnet-5')
    expect(suggestMaydaiModelForComparia(
      { source_id: 'claude-4-sonnet', organisation: 'Anthropic' },
      CLAUDE,
    )?.id).toBe('sonnet-4')
  })

  test('préfère le slug exact à une variante datée, et tombe sur la date s’il n’y a qu’elle', () => {
    const both = [
      model({ id: 'exact', slug: 'magistral-medium', model_name: 'Magistral Medium', model_provider: 'Mistral' }),
      model({ id: 'dated', slug: 'magistral-medium-2506', model_name: 'Magistral Medium 2506', model_provider: 'Mistral' }),
    ]
    expect(suggestMaydaiModelForComparia(
      { source_id: 'magistral-medium', organisation: 'Mistral AI' },
      both,
    )?.id).toBe('exact')
    expect(suggestMaydaiModelForComparia(
      { source_id: 'magistral-medium', organisation: 'Mistral AI' },
      [both[1]!],
    )?.id).toBe('dated')
  })

  test('retire une date ISO, un suffixe technique ou un .0 final', () => {
    const models = [
      model({ id: 'qwen-max', slug: 'qwen3-max', model_name: 'Qwen3 Max', model_provider: 'Qwen' }),
      model({ id: 'qwen-thinking', slug: 'qwen3-max-thinking', model_name: 'Qwen3 Max Thinking', model_provider: 'Qwen' }),
      model({ id: 'kimi-thinking', slug: 'kimi-k2-thinking-0905', model_name: 'Kimi K2-Thinking-0905', model_provider: 'Moonshot AI' }),
      model({ id: 'large-4', slug: 'mistral-large-4', model_name: 'Mistral Large 4', model_provider: 'Mistral' }),
      model({ id: 'llama', slug: 'llama-3-3-70b-instruct', model_name: 'Llama 3.3 70B Instruct', model_provider: 'Meta' }),
    ]
    expect(suggestMaydaiModelForComparia({ source_id: 'qwen3-max-2025-09-23', organisation: 'Qwen' }, models)?.id).toBe('qwen-max')
    expect(suggestMaydaiModelForComparia({ source_id: 'kimi-k2-thinking', organisation: 'Moonshot AI' }, models)?.id).toBe('kimi-thinking')
    expect(suggestMaydaiModelForComparia({ source_id: 'mistral-large-4-0', organisation: 'Mistral AI' }, models)?.id).toBe('large-4')
    expect(suggestMaydaiModelForComparia({ source_id: 'llama-3.3-70b', organisation: 'Meta' }, models)?.id).toBe('llama')
  })

  test('reconnaît un libellé + , une variante et une taille en suffixe', () => {
    const models = [
      model({ id: 'command', slug: 'command-a', model_name: 'Command A+', model_provider: 'Cohere' }),
      model({ id: 'command-r', slug: 'command-r', model_name: 'Command R+', model_provider: 'Cohere' }),
      model({
        id: 'deepseek-parent',
        slug: 'deepseek-v3',
        model_name: 'DeepSeek-V3',
        model_provider: 'DeepSeek',
        variants: ['DeepSeek-V3.1'],
      }),
      model({ id: 'deepseek-31', slug: 'deepseek-v3-1', model_name: 'DeepSeek-V3.1', model_provider: 'DeepSeek' }),
      model({ id: 'nemotron', slug: 'nemotron-3-5-lightning-30b-a3b', model_name: 'Nemotron 3.5 Lightning (30B A3B)', model_provider: 'NVIDIA' }),
      model({ id: 'maverick', slug: 'llama-4-maverick', model_name: 'Llama 4 Maverick', model_provider: 'Meta' }),
      model({ id: 'scout', slug: 'llama-4-scout', model_name: 'Llama 4 Scout', model_provider: 'Meta' }),
    ]
    expect(suggestMaydaiModelForComparia({ source_id: 'command-a-plus', organisation: 'Cohere' }, models)?.id).toBe('command')
    expect(suggestMaydaiModelForComparia({ source_id: 'deepseek-chat-v3.1', organisation: 'DeepSeek' }, models)?.id).toBe('deepseek-31')
    expect(suggestMaydaiModelForComparia({ source_id: 'nemotron-3-5-lightning', organisation: 'Nvidia' }, models)?.id).toBe('nemotron')
    expect(suggestMaydaiModelForComparia({ source_id: 'llama-maverick', organisation: 'Meta' }, models)?.id).toBe('maverick')
  })

  test('ne pré-remplit pas un doute, une autre version ou un autre éditeur', () => {
    const kimi = [
      model({ id: 'instruct', slug: 'kimi-k2-instruct', model_name: 'Kimi K2 Instruct', model_provider: 'Moonshot AI' }),
      model({ id: 'dated', slug: 'kimi-k2-0905', model_name: 'Kimi K2 0905', model_provider: 'Moonshot AI' }),
    ]
    const flashes = [
      model({ id: 'april', slug: 'deepseek-v4-flash-0423', model_name: 'DeepSeek-V4-Flash-0423', model_provider: 'DeepSeek' }),
      model({ id: 'july', slug: 'deepseek-v4-flash-0731', model_name: 'DeepSeek-V4-Flash-0731', model_provider: 'DeepSeek' }),
    ]
    expect(suggestMaydaiModelForComparia({ source_id: 'kimi-k2', organisation: 'Moonshot AI' }, kimi)).toBeNull()
    expect(suggestMaydaiModelForComparia({ source_id: 'deepseek-v4-flash', organisation: 'DeepSeek' }, flashes)).toBeNull()
    expect(suggestMaydaiModelForComparia(
      { source_id: 'granite-4.1-8b', organisation: 'IBM' },
      [model({ id: 'granite', slug: 'ibm-granite-4-2-8b', model_name: 'IBM Granite 4.2 8B', model_provider: 'IBM' })],
    )).toBeNull()
    expect(suggestMaydaiModelForComparia(
      { source_id: 'claude-4-5-sonnet', organisation: 'Anthropic' },
      [model({ id: 'other', slug: 'claude-sonnet-4-5', model_name: 'Claude Sonnet 4.5', model_provider: 'OpenAI' })],
    )).toBeNull()
  })
})
