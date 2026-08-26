/** @jest-environment node */

const agentsComplete = jest.fn()
const loadEvaluationContext = jest.fn()

jest.mock('@/lib/mistral/client', () => ({
  getMistralClient: () => ({
    agents: { complete: agentsComplete },
  }),
}))

jest.mock('@/lib/api-auth', () => ({
  getAuthenticatedSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/mistral/load-evaluation-context', () => ({
  parseUsecaseId: jest.requireActual('@/lib/mistral/load-evaluation-context').parseUsecaseId,
  buildEvaluationContextSystemMessage: jest.requireActual('@/lib/mistral/load-evaluation-context')
    .buildEvaluationContextSystemMessage,
  EVALUATION_TONE_DEFAULT: jest.requireActual('@/lib/mistral/load-evaluation-context')
    .EVALUATION_TONE_DEFAULT,
  EVALUATION_TONE_LEGAL: jest.requireActual('@/lib/mistral/load-evaluation-context')
    .EVALUATION_TONE_LEGAL,
  loadEvaluationContext: (...args: unknown[]) => loadEvaluationContext(...args),
}))

jest.mock('@/lib/mistral/persist-evaluation-answers', () => ({
  upsertUsecaseGraphAnswers: jest.fn().mockResolvedValue(undefined),
  loadUsecaseGraphAnswers: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { DEFAULT_EVALUATION_AGENT_ID } from '@/lib/mistral/agents'
import {
  SAVE_EVALUATION_NODES_TOOL_NAME,
  SAVE_SINGLE_ANSWER_TOOL_NAME,
} from '@/lib/mistral/evaluation-tool'
import { mapEvaluationNodesToAnswers } from '@/lib/mistral/map-evaluation-nodes'
import {
  loadUsecaseGraphAnswers,
  upsertUsecaseGraphAnswers,
} from '@/lib/mistral/persist-evaluation-answers'
import { EVALUATION_TONE_DEFAULT, EVALUATION_TONE_LEGAL } from '@/lib/mistral/load-evaluation-context'
import { POST, GET } from '../route'

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'
const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'

const projectContext = {
  usecaseId: USECASE_ID,
  name: 'Assistant RH',
  description: 'Aide au tri des candidatures',
  ai_category: 'Large Language Model (LLM)',
  system_type: 'Système autonome',
  company_id: COMPANY_ID,
  industry: 'tech_data',
  sub_category_id: null,
  industryLabel: 'Tech, Data & Télécoms',
}

const validNodes = {
  role_deduit: 'deployeur',
  is_art5_interdit: false,
  domaine_annexe3: 'Emploi',
  explication_courte: 'IA RH utilisée sans modification du modèle.',
}

function answersAtQ5() {
  return {
    ...mapEvaluationNodesToAnswers(validNodes),
    'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
  }
}

function makeRequest(body: unknown, withAuth = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers.authorization = 'Bearer test-token'
  return new NextRequest('http://localhost/api/chat/evaluation', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/chat/evaluation', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user,
      supabase,
    })
    loadEvaluationContext.mockResolvedValue({ ok: true, context: projectContext })
    ;(loadUsecaseGraphAnswers as jest.Mock).mockReset()
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue({})
  })

  test('refuse une requête non authentifiée', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(new Error('Unauthorized'))
    const response = await POST(
      makeRequest(
        { usecase_id: USECASE_ID, messages: [{ role: 'user', content: 'Bonjour' }] },
        false
      )
    )
    expect(response.status).toBe(401)
    expect(agentsComplete).not.toHaveBeenCalled()
  })

  test('refuse un usecase_id manquant', async () => {
    const response = await POST(
      makeRequest({ messages: [{ role: 'user', content: 'Bonjour' }] })
    )
    expect(response.status).toBe(400)
    expect(loadEvaluationContext).not.toHaveBeenCalled()
  })

  test('propage un accès refusé au cas d’usage', async () => {
    loadEvaluationContext.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Accès refusé',
      code: 'ACCESS_DENIED',
    })
    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Bonjour' }],
      })
    )
    expect(response.status).toBe(403)
    expect(agentsComplete).not.toHaveBeenCalled()
  })

  test('injecte le message système de contexte avant l’historique', async () => {
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Comment les équipes RH s’en servent-elles ?', toolCalls: [] } }],
    })

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'On trie des CV.' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      type: 'MESSAGE',
      content: 'Comment les équipes RH s’en servent-elles ?',
    })
    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: DEFAULT_EVALUATION_AGENT_ID,
        toolChoice: 'auto',
        tools: [
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({ name: SAVE_EVALUATION_NODES_TOOL_NAME }),
          }),
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({ name: SAVE_SINGLE_ANSWER_TOOL_NAME }),
          }),
        ],
        messages: [
          {
            role: 'system',
            content:
              "CONTEXTE PROJET : L'entreprise opère dans le secteur Tech, Data & Télécoms. Le projet s'appelle Assistant RH et consiste en Aide au tri des candidatures.\n\n" +
              EVALUATION_TONE_DEFAULT,
          },
          { role: 'user', content: 'On trie des CV.' },
        ],
      })
    )
  })

  test('injecte le jargon juridique DPO dans le system prompt', async () => {
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue({
      ...answersAtQ5(),
      'E4.N7.Q1.2': 'E4.N7.Q1.2.C',
    })
    agentsComplete.mockResolvedValue({
      choices: [{ message: { content: 'Selon l’article 6…', toolCalls: [] } }],
    })

    await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Pouvez-vous préciser le risque ?' }],
      })
    )

    expect(agentsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining(EVALUATION_TONE_LEGAL),
          }),
        ]),
      })
    )
  })

  test('sauvegarde les nœuds et renvoie NEW_QUESTION_NODE', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: '',
            toolCalls: [
              {
                function: {
                  name: SAVE_EVALUATION_NODES_TOOL_NAME,
                  arguments: JSON.stringify(validNodes),
                },
              },
            ],
          },
        },
      ],
    })
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue(mapEvaluationNodesToAnswers(validNodes))

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'On utilise ChatGPT sans le modifier.' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N7.Q1.2')
    expect(payload.engineInstruction).toContain('save_single_answer')
    expect(payload.data).toEqual(validNodes)
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      supabase,
      user,
      USECASE_ID,
      mapEvaluationNodesToAnswers(validNodes)
    )
  })

  test('si l’agent répond par un message d’attente, reprend la question du graphe', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Je vous tiens informé dès que c’est fait ! *(Cela prend quelques secondes.)*',
          },
        },
      ],
    })
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue(
      mapEvaluationNodesToAnswers(validNodes)
    )

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Un humain valide toujours.' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N7.Q1.2')
  })

  test('retourne 422 si le tool_call a un rôle invalide', async () => {
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            toolCalls: [
              {
                function: {
                  name: SAVE_EVALUATION_NODES_TOOL_NAME,
                  arguments: { ...validNodes, role_deduit: 'admin' },
                },
              },
            ],
          },
        },
      ],
    })

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Terminé' }],
      })
    )
    expect(response.status).toBe(422)
  })

  test('save_single_answer persiste le code et enchaîne la question suivante', async () => {
    const baseAnswers = answersAtQ5()
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            toolCalls: [
              {
                function: {
                  name: SAVE_SINGLE_ANSWER_TOOL_NAME,
                  arguments: {
                    question_id: 'E4.N7.Q5',
                    selected_option_code: 'E4.N7.Q5.B',
                  },
                },
              },
            ],
          },
        },
      ],
    })
    ;(loadUsecaseGraphAnswers as jest.Mock)
      .mockResolvedValueOnce(baseAnswers)
      .mockResolvedValueOnce({ ...baseAnswers, 'E4.N7.Q5': 'E4.N7.Q5.B' })

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [
          { role: 'system', content: 'Le moteur de conformité a besoin de savoir ceci : Q5' },
          { role: 'user', content: 'Non, l’IA décide toute seule.' },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N8.Q9')
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      { 'E4.N7.Q5': 'E4.N7.Q5.B' }
    )
  })

  test('accepte un libellé « Non » à la place du code catalogue Q5', async () => {
    const baseAnswers = answersAtQ5()
    agentsComplete.mockResolvedValue({
      choices: [
        {
          message: {
            toolCalls: [
              {
                function: {
                  name: SAVE_SINGLE_ANSWER_TOOL_NAME,
                  arguments: {
                    question_id: 'E4.N7.Q5',
                    selected_option_code: 'Non',
                  },
                },
              },
            ],
          },
        },
      ],
    })
    ;(loadUsecaseGraphAnswers as jest.Mock)
      .mockResolvedValueOnce(baseAnswers)
      .mockResolvedValueOnce({ ...baseAnswers, 'E4.N7.Q5': 'E4.N7.Q5.B' })

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Non' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      { 'E4.N7.Q5': 'E4.N7.Q5.B' }
    )
  })

  test('enregistre une réponse 1/2/3 aux nœuds d’entrée sans attendre Mistral', async () => {
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValueOnce({})

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [
          {
            role: 'assistant',
            content:
              '### Pour affiner l’évaluation, je vais vous poser **3 questions ultra-ciblées** :',
          },
          {
            role: 'user',
            content:
              '1. Non, on utilise GPT-5.3 sans modification. 2. Non à tout. 3. Non, c’est juste du marketing.',
          },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(agentsComplete).not.toHaveBeenCalled()
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N7.Q1.2')
    expect(payload.data).toEqual({
      role_deduit: 'deployeur',
      is_art5_interdit: false,
      domaine_annexe3: 'Aucun',
      explication_courte:
        'Non, on utilise GPT-5.3 sans modification Non à tout Non, c’est juste du marketing',
    })
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      {
        'E4.N7.Q1': 'E4.N7.Q1.B',
        'E4.N7.Q3': ['E4.N7.Q3.E'],
        'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
        'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
        'E4.N7.Q2': ['E4.N7.Q2.G'],
      }
    )
  })

  test('enregistre « non » sur Q9 sans attendre Mistral et passe à Q9.1', async () => {
    const atQ9 = {
      ...answersAtQ5(),
      'E4.N7.Q5': 'E4.N7.Q5.B',
    }
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValueOnce(atQ9)

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'non' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(agentsComplete).not.toHaveBeenCalled()
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N8.Q9.1')
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      { 'E4.N8.Q9': 'E4.N8.Q9.B' }
    )
  })

  test('enregistre un Persona Q1.2 sans appeler Mistral et enchaîne', async () => {
    const atPersona = mapEvaluationNodesToAnswers(validNodes)
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValueOnce(atPersona)

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [
          {
            role: 'user',
            content: 'Je suis le Data Protection Officer (DPO) de mon entreprise',
          },
        ],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(agentsComplete).not.toHaveBeenCalled()
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).not.toBe('E4.N7.Q1.2')
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      { 'E4.N7.Q1.2': 'E4.N7.Q1.2.C' }
    )
  })

  test('corrige Annexe III Emploi si l’utilisateur dit que ce n’est pas ce domaine', async () => {
    const baseAnswers = answersAtQ5()
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue(baseAnswers)

    const response = await POST(
      makeRequest({
        usecase_id: USECASE_ID,
        messages: [{ role: 'user', content: 'Cela ne correspond pas à ce domaine' }],
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(agentsComplete).not.toHaveBeenCalled()
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N8.Q9')
    expect(upsertUsecaseGraphAnswers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      USECASE_ID,
      { 'E4.N7.Q2': ['E4.N7.Q2.G'] }
    )
  })
})

describe('GET /api/chat/evaluation', () => {
  const supabase = {}
  const user = { id: 'user-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockResolvedValue({
      user,
      supabase,
    })
    loadEvaluationContext.mockResolvedValue({ ok: true, context: projectContext })
    ;(loadUsecaseGraphAnswers as jest.Mock).mockReset()
  })

  test('refuse une requête non authentifiée', async () => {
    ;(getAuthenticatedSupabaseClient as jest.Mock).mockRejectedValue(new Error('Unauthorized'))
    const response = await GET(
      new NextRequest(`http://localhost/api/chat/evaluation?usecase_id=${USECASE_ID}`)
    )
    expect(response.status).toBe(401)
  })

  test('indique NOT_STARTED s’il n’y a pas encore de réponses', async () => {
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue({})
    const response = await GET(
      new NextRequest(`http://localhost/api/chat/evaluation?usecase_id=${USECASE_ID}`)
    )
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload).toEqual({ type: 'NOT_STARTED' })
    expect(agentsComplete).not.toHaveBeenCalled()
  })

  test('reprend à la question courante du graphe', async () => {
    ;(loadUsecaseGraphAnswers as jest.Mock).mockResolvedValue(
      mapEvaluationNodesToAnswers(validNodes)
    )
    const response = await GET(
      new NextRequest(`http://localhost/api/chat/evaluation?usecase_id=${USECASE_ID}`)
    )
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.type).toBe('NEW_QUESTION_NODE')
    expect(payload.question.id).toBe('E4.N7.Q1.2')
  })
})
