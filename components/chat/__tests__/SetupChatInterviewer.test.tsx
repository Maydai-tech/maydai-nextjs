import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import SetupChatInterviewer from '../SetupChatInterviewer'
import { SAVE_USECASE_SETUP_TOOL_NAME } from '@/lib/mistral/setup-tool'
import { useCaseRoutes } from '@/app/(saas)/usecases/[id]/utils/routes'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
    user: { id: 'user-1' },
    loading: false,
  }),
}))

const COMPANY_ID = '14147fa7-d3d9-4f9a-adc0-3a8563d7a985'
const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'

const completedToolCall = {
  type: 'TOOL_CALL',
  tool: SAVE_USECASE_SETUP_TOOL_NAME,
  setupComplete: true,
  usecase_id: USECASE_ID,
  data: {
    name: 'Assistant RH',
    description: 'Aide au tri des candidatures',
    deployment_phase: 'en_projet',
    responsible_service: 'Ressources Humaines (RH)',
    ai_category: 'Large Language Model (LLM)',
    system_type: 'Système autonome',
    deployment_countries: ['France'],
    technology_partner: 'Mistral',
    llm_model_version: 'Mistral Large',
  },
}

function typeAndSubmit(text: string) {
  fireEvent.change(screen.getByLabelText('Votre message'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
}

describe('SetupChatInterviewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    Element.prototype.scrollIntoView = jest.fn()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('affiche Loader2 pendant l’attente de /api/chat/setup', async () => {
    let resolveFetch: ((value: Response) => void) | undefined
    ;(global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )

    render(<SetupChatInterviewer companyId={COMPANY_ID} />)
    typeAndSubmit('Traducteur HTML')

    expect(await screen.findByTestId('setup-chat-pending')).toBeInTheDocument()
    expect(screen.getByTestId('setup-chat-send-loader')).toHaveClass('animate-spin')
    expect(screen.getByText('L’assistant réfléchit…')).toBeInTheDocument()

    await act(async () => {
      resolveFetch?.(
        {
          ok: true,
          json: async () => ({ type: 'MESSAGE', content: 'Quel est le service en charge ?' }),
        } as Response
      )
    })

    await waitFor(() => {
      expect(screen.queryByTestId('setup-chat-pending')).not.toBeInTheDocument()
    })
  })

  test('log console.error et affiche un toast si l’appel échoue', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erreur lors de l’appel à l’agent Mistral' }),
    })

    render(<SetupChatInterviewer companyId={COMPANY_ID} />)
    typeAndSubmit('Traducteur HTML')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erreur lors de l’appel à l’agent Mistral'
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      '[SetupChatInterviewer]',
      expect.objectContaining({ message: 'Erreur lors de l’appel à l’agent Mistral' })
    )

    consoleSpy.mockRestore()
  })

  test('redirige vers l’évaluation après le tool call Mistral', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => completedToolCall,
    })

    render(<SetupChatInterviewer companyId={COMPANY_ID} />)
    typeAndSubmit('Voici les 9 informations.')

    expect(
      await screen.findByText(/Redirection vers l’évaluation dans 3 secondes/i)
    ).toBeInTheDocument()

    await act(async () => {
      jest.advanceTimersByTime(3000)
    })

    expect(mockPush).toHaveBeenCalledWith(useCaseRoutes.chatEvaluation(USECASE_ID))
  })
})
