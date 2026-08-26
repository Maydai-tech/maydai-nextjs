/** @jest-environment node */

const agentsComplete = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    agents: { complete: agentsComplete },
  }),
}))

import {
  completeMistralAgent,
  DEFAULT_CONVERSATION_AGENT_ID,
  DEFAULT_REPORT_AGENT_ID,
  extractAgentTextContent,
  getReportAgentId,
} from '@/lib/mistral/agents'

describe('completeMistralAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.MISTRAL_CONVERSATION_AGENT_ID
  })

  test('extractAgentTextContent accepte string et chunks texte', () => {
    expect(extractAgentTextContent('  Bonjour  ')).toBe('Bonjour')
    expect(extractAgentTextContent([{ type: 'text', text: 'Hello' }, { type: 'text', text: ' world' }])).toBe(
      'Hello world'
    )
  })

  test('appelle client.agents.complete (pas un modèle) avec l’agent conversationnel', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Parfait, commençons par le nom du système.' } }],
    })

    const content = await completeMistralAgent([
      { role: 'user', content: 'Bonjour, je veux créer un système RH basé sur Mistral' },
    ])

    expect(content).toBe('Parfait, commençons par le nom du système.')
    expect(agentsComplete).toHaveBeenCalledWith({
      agentId: DEFAULT_CONVERSATION_AGENT_ID,
      messages: [
        {
          role: 'user',
          content: 'Bonjour, je veux créer un système RH basé sur Mistral',
        },
      ],
    })
  })

  test('refuse une liste de messages vide', async () => {
    await expect(completeMistralAgent([])).rejects.toThrow(/Au moins un message/)
    expect(agentsComplete).not.toHaveBeenCalled()
  })

  test('getReportAgentId utilise l’agent rapport par défaut', () => {
    delete process.env.MISTRAL_REPORT_AGENT_ID
    expect(getReportAgentId()).toBe(DEFAULT_REPORT_AGENT_ID)
  })
})
