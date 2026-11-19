/** @jest-environment node */

const agentsComplete = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    agents: { complete: agentsComplete },
  }),
}))

import { completeReportAgent, parseJsonObjectFromAgentText } from '../complete-report-agent'
import { DEFAULT_REPORT_AGENT_ID } from '../agents'
import { getChatReportResponseFormat } from '../report-json-schema'

describe('completeReportAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.MISTRAL_REPORT_AGENT_ID
  })

  test('parseJsonObjectFromAgentText accepte un JSON brut ou fencé', () => {
    expect(parseJsonObjectFromAgentText('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonObjectFromAgentText('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })

  test('appelle l’agent rapport avec json_schema strict (9 actions)', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              introduction_contextuelle: 'Intro',
              evaluation_risque: { niveau: 'Risque minimal', justification: 'OK' },
              quick_win_1: 'OUI : a. Références : Art. 16.',
              quick_win_2: 'NON : b. Références : Art. 14.',
              quick_win_3: 'NON : c. Références : Art. 13.',
              priorite_1: 'NON : d. Références : Art. 11.',
              priorite_2: 'NON : e. Références : Art. 50.',
              priorite_3: 'NON : f. Références : Art. 10.',
              action_1: 'NON : g. Références : Art. 9.',
              action_2: 'NON : h. Références : Art. 15.',
              action_3: 'NON : i. Références : Art. 4.',
              impact_attendu: 'Impact',
              conclusion: 'Conclusion',
            }),
          },
        },
      ],
    })

    const report = await completeReportAgent({
      messages: [{ role: 'user', content: 'Génère le rapport' }],
      isUnacceptable: false,
    })

    const parsed = JSON.parse(report) as { evaluation_risque: { niveau: string } }
    expect(parsed.evaluation_risque.niveau).toBe('Risque minimal')
    expect(agentsComplete).toHaveBeenCalledWith({
      agentId: DEFAULT_REPORT_AGENT_ID,
      messages: [{ role: 'user', content: 'Génère le rapport' }],
      responseFormat: getChatReportResponseFormat(false),
    })
  })

  test('utilise le schéma interdit lorsque le cas est inacceptable', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              introduction_contextuelle: 'Intro',
              evaluation_risque: { niveau: 'Interdit', justification: 'Art. 5' },
              interdit_1: 'Motif',
              interdit_2: 'Preuve',
              interdit_3: 'Sécurisation',
              impact_attendu: 'Impact',
              conclusion: 'Conclusion',
            }),
          },
        },
      ],
    })

    await completeReportAgent({
      messages: [{ role: 'user', content: 'Cas interdit' }],
      isUnacceptable: true,
    })

    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: DEFAULT_REPORT_AGENT_ID,
        responseFormat: getChatReportResponseFormat(true),
      })
    )
  })
})
