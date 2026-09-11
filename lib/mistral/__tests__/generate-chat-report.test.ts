/** @jest-environment node */

const calculateAndPersistUseCaseScore = jest.fn()
const prepareChatReportContext = jest.fn()
const completeReportAgent = jest.fn()
const persistChatReport = jest.fn()
const updateLeadFunnelStage = jest.fn()

jest.mock('@/lib/usecase-score-service', () => {
  class UseCaseScoreError extends Error {
    status: number
    details?: string
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    calculateAndPersistUseCaseScore: (...args: unknown[]) => calculateAndPersistUseCaseScore(...args),
    UseCaseScoreError,
  }
})

jest.mock('@/lib/mistral/prepare-chat-report-context', () => ({
  prepareChatReportContext: (...args: unknown[]) => prepareChatReportContext(...args),
}))

jest.mock('@/lib/mistral/complete-report-agent', () => ({
  completeReportAgent: (...args: unknown[]) => completeReportAgent(...args),
}))

jest.mock('@/lib/mistral/persist-chat-report', () => ({
  persistChatReport: (...args: unknown[]) => persistChatReport(...args),
}))

jest.mock('@/lib/leads/lead-funnel-service', () => ({
  LEAD_FUNNEL_STAGE: { FINISHED: 4 },
  updateLeadFunnelStage: (...args: unknown[]) => updateLeadFunnelStage(...args),
}))

const completeOpenEvaluationPathRun = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/evaluation-path-run-tracking', () => ({
  completeOpenEvaluationPathRun: (...args: unknown[]) => completeOpenEvaluationPathRun(...args),
}))

import { generateChatReport } from '../generate-chat-report'
import { CONVERSATIONAL_PATH_MODE } from '../evaluation-graph-orchestrator'
import { ASSISTANT_PATH_RUN_MODE } from '@/lib/evaluation-path-run-mode'

const USECASE_ID = '660e8400-e29b-41d4-a716-446655440000'
const user = { id: 'user-1' } as never

function mockSupabase(updateError: { message: string } | null = null) {
  const eq = jest.fn().mockResolvedValue({ error: updateError })
  const update = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ update })
  return { from, update, eq }
}

describe('generateChatReport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    calculateAndPersistUseCaseScore.mockResolvedValue({
      classification_status: 'qualified',
      risk_level: 'minimal',
    })
    prepareChatReportContext.mockResolvedValue({
      usecaseId: USECASE_ID,
      usecaseName: 'Assistant RH',
      authoritativeRiskCode: 'minimal',
      riskLevelLabelFr: 'Risque minimal',
      isUnacceptable: false,
      userMessage: 'CONTEXTE',
    })
    completeReportAgent.mockResolvedValue('{"introduction_contextuelle":"ok"}')
    persistChatReport.mockResolvedValue({
      next_steps_status: 'saved',
      next_steps_saved: true,
      next_steps_error: null,
    })
  })

  test('fige le score, appelle l’agent rapport puis persiste le JSON', async () => {
    const supabase = mockSupabase()
    const result = await generateChatReport({
      supabase: supabase as never,
      user,
      usecaseId: USECASE_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.usecase_id).toBe(USECASE_ID)
      expect(result.next_steps_saved).toBe(true)
    }
    expect(supabase.from).toHaveBeenCalledWith('usecases')
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        path_mode: CONVERSATIONAL_PATH_MODE,
      })
    )
    expect(calculateAndPersistUseCaseScore).toHaveBeenCalledWith({
      client: supabase,
      usecaseId: USECASE_ID,
      actorUserId: 'user-1',
      recordHistory: true,
    })
    expect(completeReportAgent).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'CONTEXTE' }],
      isUnacceptable: false,
    })
    expect(persistChatReport).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        usecaseId: USECASE_ID,
        authoritativeRiskCode: 'minimal',
      })
    )
    expect(completeOpenEvaluationPathRun).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        usecaseId: USECASE_ID,
        pathMode: ASSISTANT_PATH_RUN_MODE,
        classificationStatus: 'qualified',
        riskLevel: 'minimal',
      })
    )
  })

  test('refuse une classification impossible après le scoring', async () => {
    calculateAndPersistUseCaseScore.mockResolvedValue({
      classification_status: 'impossible',
      risk_level: null,
    })
    const result = await generateChatReport({
      supabase: mockSupabase() as never,
      user,
      usecaseId: USECASE_ID,
    })

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: 'CLASSIFICATION_IMPOSSIBLE',
    })
    expect(completeReportAgent).not.toHaveBeenCalled()
    expect(persistChatReport).not.toHaveBeenCalled()
  })

  test('ne clôture pas le cas d’usage si la classification est impossible', async () => {
    calculateAndPersistUseCaseScore.mockResolvedValue({
      classification_status: 'impossible',
      risk_level: null,
    })
    const supabase = mockSupabase()
    await generateChatReport({
      supabase: supabase as never,
      user,
      usecaseId: USECASE_ID,
    })

    expect(supabase.update).not.toHaveBeenCalled()
  })

  test('ne clôture pas le cas d’usage si la génération du rapport échoue', async () => {
    completeReportAgent.mockRejectedValue(new Error('agent down'))
    const supabase = mockSupabase()
    const result = await generateChatReport({
      supabase: supabase as never,
      user,
      usecaseId: USECASE_ID,
    })

    expect(result.ok).toBe(false)
    expect(persistChatReport).not.toHaveBeenCalled()
    expect(supabase.update).not.toHaveBeenCalled()
  })

  test('coupe un agent Mistral bloqué sans dépasser le budget serveur', async () => {
    jest.useFakeTimers()
    completeReportAgent.mockReturnValue(new Promise(() => {}))

    try {
      const resultPromise = generateChatReport({
        supabase: mockSupabase() as never,
        user,
        usecaseId: USECASE_ID,
      })

      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.status).toBe(500)
        expect(result.details).toMatch(/Timeout/i)
      }
      expect(completeReportAgent).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })
})
