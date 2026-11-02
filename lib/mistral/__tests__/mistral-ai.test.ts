/** @jest-environment node */

const agentsComplete = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    agents: { complete: agentsComplete },
  }),
}))

import { mistralAI } from '@/lib/mistral-ai'
import { DEFAULT_DESCRIPTION_AGENT_ID } from '@/lib/mistral/agents'

describe('MistralAIService.generateDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.MISTRAL_DESCRIPTION_AGENT_ID
  })

  test('délègue à client.agents.complete avec DEFAULT_DESCRIPTION_AGENT_ID et formate les pays en tableau', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Description générée pour le cas d’usage.' } }],
    })

    const result = await mistralAI.generateDescription({
      company_name: 'MaydAI',
      name: 'Assistant RH',
      ai_category: 'LLM',
      deployment_countries: ['France', 'Belgique'],
    })

    expect(result).toBe('Description générée pour le cas d’usage.')
    expect(agentsComplete).toHaveBeenCalledTimes(1)
    expect(agentsComplete).toHaveBeenCalledWith({
      agentId: DEFAULT_DESCRIPTION_AGENT_ID,
      messages: [
        {
          role: 'user',
          content: expect.stringContaining('- Pays de déploiement : France, Belgique'),
        },
      ],
    })
  })

  test('prend en compte dynamiquement MISTRAL_DESCRIPTION_AGENT_ID à chaque appel sans réinstancier le service', async () => {
    process.env.MISTRAL_DESCRIPTION_AGENT_ID = 'ag_custom_description_agent'
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Description custom.' } }],
    })

    const result = await mistralAI.generateDescription({
      name: 'Scoring Crédit',
      ai_category: 'Machine Learning',
    })

    expect(result).toBe('Description custom.')
    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'ag_custom_description_agent',
      })
    )
  })

  test('journalise via console.error et propage une erreur explicite si l’agent échoue', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    agentsComplete.mockRejectedValue(new Error('401 Unauthorized'))

    await expect(
      mistralAI.generateDescription({ name: 'Test', ai_category: 'LLM' })
    ).rejects.toThrow("Erreur avec l'agent Mistral: 401 Unauthorized")

    expect(consoleSpy).toHaveBeenCalledWith('[MistralAIService]', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
