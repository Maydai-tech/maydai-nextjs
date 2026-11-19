import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import EvaluationChatInterviewer from '../EvaluationChatInterviewer'
import { toEvaluationQuestionNode } from '@/lib/mistral/evaluation-graph-orchestrator'

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
    user: { id: 'user-1' },
    loading: false,
  }),
}))

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'

describe('EvaluationChatInterviewer — question checkbox Q11.1', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Element.prototype.scrollIntoView = jest.fn()
    window.localStorage.clear()
    const question = toEvaluationQuestionNode('E4.N8.Q11.1')
    if (!question) throw new Error('Q11.1 manquante')
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'NEW_QUESTION_NODE',
        question,
        engineInstruction: 'save_single_answer',
      }),
    })
  })

  test('ne valide pas au premier clic : on peut cocher Texte et Les deux', async () => {
    render(
      <EvaluationChatInterviewer
        usecaseId={USECASE_ID}
        industryLabel="Tech, Data & Télécoms"
      />
    )

    expect(await screen.findByRole('button', { name: 'Texte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Image, audio ou vidéo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Les deux' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Texte' }))
    expect(global.fetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Les deux' }))
    const validate = screen.getByRole('button', { name: 'Valider' })
    expect(validate).not.toBeDisabled()

    fireEvent.click(validate)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
    const postCall = (global.fetch as jest.Mock).mock.calls[1]
    expect(postCall[0]).toBe('/api/chat/evaluation')
    const body = JSON.parse(postCall[1].body as string) as {
      messages: Array<{ role: string; content: string }>
    }
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'Les deux' })
  })
})
