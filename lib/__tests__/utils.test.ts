import { parseApiJson, toTitleCase } from '../utils'

describe('toTitleCase', () => {
  test('capitalizes the first letter and lowercases the rest', () => {
    expect(toTitleCase('anthropic')).toBe('Anthropic')
    expect(toTitleCase('OPENAI')).toBe('Openai')
  })

  test('preserves intentional mixed case such as OpenAI', () => {
    expect(toTitleCase('OpenAI')).toBe('OpenAI')
  })
})

describe('parseApiJson', () => {
  test('rejects HTML error pages instead of throwing a JSON syntax error', async () => {
    const response = {
      status: 404,
      text: async () => '<!DOCTYPE html><html></html>',
    } as Response
    await expect(parseApiJson(response)).rejects.toThrow('Route API introuvable.')
  })

  test('parses a JSON payload', async () => {
    const response = {
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    } as Response
    await expect(parseApiJson<{ ok: boolean }>(response)).resolves.toEqual({ ok: true })
  })
})

describe('toTitleCase', () => {
  test('capitalizes the first letter and lowercases the rest', () => {
    expect(toTitleCase('anthropic')).toBe('Anthropic')
    expect(toTitleCase('OPENAI')).toBe('Openai')
  })

  test('preserves intentional mixed case such as OpenAI', () => {
    expect(toTitleCase('OpenAI')).toBe('OpenAI')
  })
})
