/** @jest-environment node */

describe('getMistralClient', () => {
  const originalKey = process.env.MISTRAL_API_KEY

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.MISTRAL_API_KEY
    } else {
      process.env.MISTRAL_API_KEY = originalKey
    }
    jest.resetModules()
  })

  test('refuse une clé API absente', async () => {
    delete process.env.MISTRAL_API_KEY
    const { getMistralClient } = await import('@/lib/mistral/client')
    expect(() => getMistralClient()).toThrow(/MISTRAL_API_KEY/)
  })

  test('réutilise la même instance tant que la clé est inchangée', async () => {
    process.env.MISTRAL_API_KEY = 'key-a'
    const { getMistralClient } = await import('@/lib/mistral/client')
    const first = getMistralClient()
    const second = getMistralClient()
    expect(second).toBe(first)
  })
})
