import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChatEvaluationPageContent } from '../ChatEvaluationPage'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '660e8400-e29b-41d4-a716-446655440000' }),
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
    user: { id: 'user-1' },
    loading: false,
  }),
}))

jest.mock('@/app/(saas)/usecases/[id]/components/ProcessingAnimation', () => ({
  ProcessingAnimation: () => null,
}))

jest.mock('@/app/(saas)/usecases/new/components/ChatFlowStepper', () => ({
  __esModule: true,
  default: () => <div>stepper</div>,
}))

jest.mock('@/components/chat/EvaluationChatInterviewer', () => ({
  __esModule: true,
  default: ({ onPathComplete }: { onPathComplete?: () => void }) => (
    <button type="button" onClick={() => onPathComplete?.()}>
      Terminer le parcours
    </button>
  ),
}))

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'
const RUN_ID = '11111111-1111-4111-8111-111111111111'

describe('ChatEvaluationPageContent — tracking parcours assistant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === `/api/usecases/${USECASE_ID}`) {
        return {
          ok: true,
          json: async () => ({
            name: 'Assistant RH',
            description: 'Tri des candidatures',
            questionnaire_version: 3,
          }),
        }
      }
      if (url === `/api/usecases/${USECASE_ID}/evaluation-runs/start`) {
        return { ok: true, json: async () => ({ run_id: RUN_ID, reused: false }) }
      }
      if (url === `/api/usecases/${USECASE_ID}/evaluation-runs/${RUN_ID}`) {
        return { ok: true, json: async () => ({ ok: true }) }
      }
      if (url === '/api/chat/generate-report') {
        return { ok: true, json: async () => ({ success: true }) }
      }
      throw new Error(`fetch inattendu: ${url} ${init?.method ?? 'GET'}`)
    }) as unknown as typeof fetch
  })

  test('démarre un run assistant puis le clôture à la fin du graphe', async () => {
    render(<ChatEvaluationPageContent />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/usecases/${USECASE_ID}/evaluation-runs/start`,
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    const startCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[0] === `/api/usecases/${USECASE_ID}/evaluation-runs/start`
    )
    expect(JSON.parse(startCall[1].body as string)).toEqual({
      path_mode: 'assistant',
      entry_surface: 'chat_evaluation',
      questionnaire_version: 3,
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Terminer le parcours' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/usecases/${USECASE_ID}/evaluation-runs/${RUN_ID}`,
        expect.objectContaining({ method: 'PATCH' })
      )
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/generate-report',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
