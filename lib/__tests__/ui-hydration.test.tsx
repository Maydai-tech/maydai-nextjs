/**
 * Hydratation UI court → long : les radios doivent refléter formattedAnswers après refreshResponses forcé.
 */
import React, { useEffect, useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QuestionRenderer } from '@/app/(saas)/usecases/[id]/components/evaluation/QuestionRenderer'
import { useEvaluation } from '@/app/(saas)/usecases/[id]/hooks/useEvaluation'
import { loadQuestions } from '@/app/(saas)/usecases/[id]/utils/questions-loader'
import type { QuestionnairePathMode } from '@/app/(saas)/usecases/[id]/utils/questionnaire'
import {
  simulateGetResponsesAfterMerge,
  simulateShortPathSavePipeline,
  shortPathPivotRows,
} from '@/lib/debug-court-long-pipeline'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'

const USECASE_ID = 'ui-hydration-test-usecase'

const { formattedAnswers: longMergedAnswers } = simulateGetResponsesAfterMerge(
  simulateShortPathSavePipeline(shortPathPivotRows()).usecaseResponses,
  simulateShortPathSavePipeline(shortPathPivotRows()).checklists
)

/** Réponses courtes sans clés E5 dépliées (état local biaisé avant merge GET). */
const shortLocalAnswers = Object.fromEntries(
  Object.entries(longMergedAnswers).filter(([k]) => !k.startsWith('E5.N9.'))
) as Record<string, unknown>

type MockApiState = {
  formattedAnswers: Record<string, unknown>
  loading: boolean
}

let mockApiState: MockApiState = {
  formattedAnswers: { ...shortLocalAnswers },
  loading: false,
}

const mockRefreshResponses = jest.fn()

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
    user: { id: 'user-1' },
    loading: false,
  }),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { checklist_gov_enterprise: [], checklist_gov_usecase: [] },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

jest.mock('@/lib/hooks/useQuestionnaireResponses', () => ({
  useQuestionnaireResponses: () => {
    const [, setTick] = useState(0)
    useEffect(() => {
      const bump = () => setTick((t) => t + 1)
      mockRefreshListeners.add(bump)
      return () => {
        mockRefreshListeners.delete(bump)
      }
    }, [])

    return {
      formattedAnswers: mockApiState.formattedAnswers,
      loading: mockApiState.loading,
      saving: false,
      saveResponse: jest.fn(),
      refreshResponses: mockRefreshResponses,
      responses: [],
      error: null,
      saveMultiple: jest.fn(),
      getResponse: jest.fn(),
      hasResponse: jest.fn(),
    }
  },
}))

const mockRefreshListeners = new Set<() => void>()

function notifyMockListeners() {
  mockRefreshListeners.forEach((fn) => fn())
}

function EvaluationHydrationHarness({ pathMode }: { pathMode: QuestionnairePathMode }) {
  const { questionnaireData, setAnswerForQuestion } = useEvaluation({
    usecaseId: USECASE_ID,
    questionnaireVersion: QUESTIONNAIRE_VERSION_V3,
    systemType: 'Produit',
    questionnairePathMode: pathMode,
    onComplete: jest.fn(),
  })

  const questions = loadQuestions()
  const targetId = 'E5.N9.Q1'
  const question = questions[targetId]

  return (
    <div data-testid="hydration-harness" data-question-id={targetId}>
      <QuestionRenderer
        question={question}
        currentAnswer={questionnaireData.answers[targetId]}
        onAnswerChange={(a) => setAnswerForQuestion(targetId, a)}
        questionnairePathMode={pathMode}
      />
    </div>
  )
}

describe('UI hydration court → long', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRefreshListeners.clear()
    mockApiState = {
      formattedAnswers: { ...shortLocalAnswers },
      loading: false,
    }
    let fetchAlreadyDone = false
    mockRefreshResponses.mockImplementation(async (options?: { force?: boolean }) => {
      if (!options?.force) {
        if (fetchAlreadyDone) return
        fetchAlreadyDone = true
        return
      }
      mockApiState = { ...mockApiState, loading: true }
      notifyMockListeners()
      await Promise.resolve()
      mockApiState = {
        formattedAnswers: { ...longMergedAnswers },
        loading: false,
      }
      notifyMockListeners()
    })
  })

  test('après bascule long + refresh forcé, la radio Oui (E5.N9.Q1) est cochée', async () => {
    const { rerender } = render(<EvaluationHydrationHarness pathMode="short" />)

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Oui/i })).not.toBeChecked()
    })

    // Premier GET déjà effectué (comme au chargement réel de l’évaluation).
    await act(async () => {
      await mockRefreshResponses()
    })

    rerender(<EvaluationHydrationHarness pathMode="long" />)

    await waitFor(() => {
      expect(mockRefreshResponses).toHaveBeenCalledWith({ force: true })
    })

    await waitFor(
      () => {
        expect(screen.getByRole('radio', { name: /Oui/i })).toBeChecked()
      },
      { timeout: 5000 }
    )

    expect(mockApiState.formattedAnswers['E5.N9.Q1']).toBe('E5.N9.Q1.A')
  })
})
