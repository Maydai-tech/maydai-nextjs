import { guidedChatReducer } from '../useGuidedChatState'
import type { GuidedChatState } from '../../types'
import { createEmptyDraft, CHAT_STEP_BOT_MESSAGES } from '../../types'

function makeInitialState(overrides: Partial<GuidedChatState> = {}): GuidedChatState {
  return {
    currentStepId: 'name',
    draft: createEmptyDraft(),
    messages: [
      { id: 'msg-init', role: 'bot', content: CHAT_STEP_BOT_MESSAGES['name'], stepId: 'name', timestamp: Date.now() },
    ],
    isSubmitting: false,
    isGeneratingDescription: false,
    editingFromReview: false,
    ...overrides,
  }
}

describe('guidedChatReducer', () => {
  describe('SET_FIELD_VALUE', () => {
    test('updates a string field in draft', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, {
        type: 'SET_FIELD_VALUE',
        field: 'name',
        value: 'Mon cas d\'usage',
      })
      expect(next.draft.name).toBe('Mon cas d\'usage')
    })

    test('updates deployment_countries array field', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, {
        type: 'SET_FIELD_VALUE',
        field: 'deployment_countries',
        value: ['FR', 'DE'],
      })
      expect(next.draft.deployment_countries).toEqual(['FR', 'DE'])
    })
  })

  describe('GO_TO_NEXT_STEP', () => {
    test('advances from name to deployment_date', () => {
      const state = makeInitialState({ currentStepId: 'name' })
      const next = guidedChatReducer(state, {
        type: 'GO_TO_NEXT_STEP',
        userMessage: 'Mon use case',
      })
      expect(next.currentStepId).toBe('deployment_date')
    })

    test('adds user and bot messages', () => {
      const state = makeInitialState({ currentStepId: 'name' })
      const next = guidedChatReducer(state, {
        type: 'GO_TO_NEXT_STEP',
        userMessage: 'Mon use case',
      })
      const lastMessages = next.messages.slice(-2)
      expect(lastMessages[0].role).toBe('user')
      expect(lastMessages[0].content).toBe('Mon use case')
      expect(lastMessages[1].role).toBe('bot')
    })

    test('advances through all steps in order', () => {
      const stepOrder = [
        'name', 'deployment_date', 'responsible_service',
        'technology_partner', 'llm_model_version', 'ai_category',
        'system_type', 'deployment_countries', 'description',
      ]

      let state = makeInitialState({ currentStepId: 'name' })
      for (let i = 0; i < stepOrder.length - 1; i++) {
        state = guidedChatReducer(state, {
          type: 'GO_TO_NEXT_STEP',
          userMessage: `Réponse ${i}`,
        })
        expect(state.currentStepId).toBe(stepOrder[i + 1])
      }
    })

    test('goes to review after description (last field step)', () => {
      const state = makeInitialState({ currentStepId: 'description' })
      const next = guidedChatReducer(state, {
        type: 'GO_TO_NEXT_STEP',
        userMessage: 'Ma description',
      })
      expect(next.currentStepId).toBe('review')
    })
  })

  describe('GO_TO_PREVIOUS_STEP', () => {
    test('goes back from deployment_date to name', () => {
      const state = makeInitialState({ currentStepId: 'deployment_date' })
      const next = guidedChatReducer(state, { type: 'GO_TO_PREVIOUS_STEP' })
      expect(next.currentStepId).toBe('name')
    })

    test('stays at name if already at first step', () => {
      const state = makeInitialState({ currentStepId: 'name' })
      const next = guidedChatReducer(state, { type: 'GO_TO_PREVIOUS_STEP' })
      expect(next.currentStepId).toBe('name')
    })
  })

  describe('GO_TO_REVIEW', () => {
    test('sets step to review', () => {
      const state = makeInitialState({ currentStepId: 'description' })
      const next = guidedChatReducer(state, {
        type: 'GO_TO_REVIEW',
        userMessage: 'Ma description finale',
      })
      expect(next.currentStepId).toBe('review')
      expect(next.editingFromReview).toBe(false)
    })
  })

  describe('EDIT_FROM_REVIEW', () => {
    test('navigates to target step and sets editing flag', () => {
      const state = makeInitialState({ currentStepId: 'review' })
      const next = guidedChatReducer(state, {
        type: 'EDIT_FROM_REVIEW',
        stepId: 'ai_category',
      })
      expect(next.currentStepId).toBe('ai_category')
      expect(next.editingFromReview).toBe(true)
    })

    test('adds bot message about modification', () => {
      const state = makeInitialState({ currentStepId: 'review' })
      const next = guidedChatReducer(state, {
        type: 'EDIT_FROM_REVIEW',
        stepId: 'name',
      })
      const lastMsg = next.messages[next.messages.length - 1]
      expect(lastMsg.role).toBe('bot')
      expect(lastMsg.content).toContain('modifier')
    })
  })

  describe('RETURN_FROM_EDIT', () => {
    test('returns to review and clears editing flag', () => {
      const state = makeInitialState({
        currentStepId: 'ai_category',
        editingFromReview: true,
      })
      const next = guidedChatReducer(state, {
        type: 'RETURN_FROM_EDIT',
        userMessage: 'Vision par ordinateur',
      })
      expect(next.currentStepId).toBe('review')
      expect(next.editingFromReview).toBe(false)
    })
  })

  describe('SKIP_STEP', () => {
    test('advances to next step with skip message', () => {
      const state = makeInitialState({ currentStepId: 'deployment_date' })
      const next = guidedChatReducer(state, {
        type: 'SKIP_STEP',
        stepId: 'deployment_date',
      })
      expect(next.currentStepId).toBe('responsible_service')
      const userMsg = next.messages.find(m => m.content === '(Passé)')
      expect(userMsg).toBeDefined()
    })
  })

  describe('SET_SUBMITTING', () => {
    test('sets submitting flag', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, { type: 'SET_SUBMITTING', value: true })
      expect(next.isSubmitting).toBe(true)
    })
  })

  describe('SET_GENERATING_DESCRIPTION', () => {
    test('sets generating description flag', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, { type: 'SET_GENERATING_DESCRIPTION', value: true })
      expect(next.isGeneratingDescription).toBe(true)
    })
  })

  describe('ADD_BOT_MESSAGE / ADD_USER_MESSAGE', () => {
    test('adds a bot message', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, { type: 'ADD_BOT_MESSAGE', content: 'Bienvenue !' })
      const lastMsg = next.messages[next.messages.length - 1]
      expect(lastMsg.role).toBe('bot')
      expect(lastMsg.content).toBe('Bienvenue !')
    })

    test('adds a user message', () => {
      const state = makeInitialState()
      const next = guidedChatReducer(state, { type: 'ADD_USER_MESSAGE', content: 'Merci' })
      const lastMsg = next.messages[next.messages.length - 1]
      expect(lastMsg.role).toBe('user')
      expect(lastMsg.content).toBe('Merci')
    })
  })
})
