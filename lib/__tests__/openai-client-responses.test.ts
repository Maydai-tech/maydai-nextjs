const mockResponsesCreate = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    responses: {
      create: mockResponsesCreate,
    },
  })),
}))

describe('OpenAIClient Responses API', () => {
  beforeEach(() => {
    jest.resetModules()
    mockResponsesCreate.mockReset()
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  test('génère un rapport avec Responses API et File Search sans stockage', async () => {
    mockResponsesCreate.mockResolvedValue({ output_text: '{"rapport":"ok"}' })
    const { OpenAIClient } = await import('../openai-client')
    const client = new OpenAIClient()

    const result = await client.generateComplianceAnalysis({
      usecase_id: 'usecase-1',
      usecase_name: 'Cas de test',
      company_name: 'MaydAI',
      responses: {
        E4_N7_Q2: {
          question: 'Domaine à risque élevé ?',
          selected_options: [],
          selected_labels: [],
        },
      },
    })

    expect(result).toBe('{"rapport":"ok"}')
    expect(mockResponsesCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      store: false,
      instructions: expect.stringContaining('Rapport MaydAI'),
      input: expect.stringContaining('Cas de test'),
      tools: [{
        type: 'file_search',
        vector_store_ids: ['vs_68b1b8fb9b608191982f946b23282bb3'],
      }],
    }))
  })

  test('rejette une réponse sans texte', async () => {
    mockResponsesCreate.mockResolvedValue({ output_text: '   ' })
    const { OpenAIClient } = await import('../openai-client')
    const client = new OpenAIClient()

    await expect(client.generateComplianceAnalysis({
      usecase_id: 'usecase-1',
      usecase_name: 'Cas de test',
      company_name: 'MaydAI',
      responses: {
        E4_N7_Q2: {
          question: 'Domaine à risque élevé ?',
          selected_options: [],
          selected_labels: [],
        },
      },
    })).rejects.toThrow('Aucune réponse textuelle')
  })
})
