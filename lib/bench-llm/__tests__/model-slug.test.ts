import { normalizeLlmModelSlug } from '../model-slug'

describe('normalizeLlmModelSlug', () => {
  test.each([
    ['GPT-5.2', 'gpt-5-2'],
    ['gpt-5.2', 'gpt-5-2'],
    ['  GPT 5.2  ', 'gpt-5-2'],
    ['Claude 4.6 Sonnet', 'claude-4-6-sonnet'],
    ['gemini-3-flash-preview', 'gemini-3-flash-preview'],
  ])('slugifies %s', (input, expected) => {
    expect(normalizeLlmModelSlug(input)).toBe(expected)
  })

  test('returns null for empty or punctuation-only values', () => {
    expect(normalizeLlmModelSlug('')).toBeNull()
    expect(normalizeLlmModelSlug('   ')).toBeNull()
    expect(normalizeLlmModelSlug('---')).toBeNull()
    expect(normalizeLlmModelSlug(null)).toBeNull()
  })
})
