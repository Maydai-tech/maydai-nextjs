import {
  canonicalLlmStatsProviderName,
  normalizeLlmStatsMatchValue,
} from '../llm-stats-sync'

describe('LLM Stats model matching', () => {
  test.each([
    ['GPT-4o', 'gpt-4o'],
    ['GPT-4 Turbo', 'gpt-4-turbo'],
    ['Claude Sonnet 4.5', 'claude-sonnet-4.5'],
    ['Claude 3.7 Sonnet', 'claude-sonnet-3.7'],
    ['Claude 3 Opus', 'claude-opus-3'],
    ['DeepSeek R1 Distill Qwen 32B', 'deepseek-r1-distill-qwen-32b'],
    ['Qwen3 VL 4B Thinking', 'qwen3-vl-4b-thinking'],
  ])('normalizes certain model-name variants: %s', (llmStatsName, maydaiName) => {
    expect(normalizeLlmStatsMatchValue(llmStatsName)).toBe(
      normalizeLlmStatsMatchValue(maydaiName),
    )
  })

  test.each([
    ['Alibaba Cloud / Qwen Team', 'Qwen'],
    ['Alibaba (Qwen)', 'Qwen'],
    ['Mistral AI', 'Mistral'],
  ])('resolves provider alias %s to %s', (sourceName, expectedName) => {
    expect(canonicalLlmStatsProviderName(sourceName)).toBe(expectedName)
  })

  test('keeps an unknown provider name unchanged', () => {
    expect(canonicalLlmStatsProviderName('New Provider')).toBe('New Provider')
  })
})
