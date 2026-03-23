'use client'

import { useReducer, useCallback } from 'react'
import type {
  GuidedChatState,
  GuidedChatDraft,
  ChatStepId,
  ChatMessage,
} from '../types'
import {
  CHAT_STEP_ORDER,
  CHAT_STEP_BOT_MESSAGES,
  createEmptyDraft,
} from '../types'

// --- Actions ---

type GuidedChatAction =
  | { type: 'SET_FIELD_VALUE'; field: keyof GuidedChatDraft; value: GuidedChatDraft[keyof GuidedChatDraft] }
  | { type: 'GO_TO_STEP'; stepId: ChatStepId }
  | { type: 'GO_TO_NEXT_STEP'; userMessage: string }
  | { type: 'GO_TO_PREVIOUS_STEP' }
  | { type: 'GO_TO_REVIEW'; userMessage: string }
  | { type: 'EDIT_FROM_REVIEW'; stepId: ChatStepId }
  | { type: 'RETURN_FROM_EDIT'; userMessage: string }
  | { type: 'ADD_BOT_MESSAGE'; content: string }
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_GENERATING_DESCRIPTION'; value: boolean }
  | { type: 'SKIP_STEP'; stepId: ChatStepId }

// --- Helpers ---

let messageCounter = 0
function createMessage(role: 'bot' | 'user', content: string, stepId?: ChatStepId): ChatMessage {
  messageCounter++
  return {
    id: `msg-${messageCounter}-${Date.now()}`,
    role,
    content,
    stepId,
    timestamp: Date.now(),
  }
}

function getNextStepId(currentStepId: ChatStepId): ChatStepId {
  const currentIndex = CHAT_STEP_ORDER.indexOf(currentStepId)
  if (currentIndex === -1 || currentIndex >= CHAT_STEP_ORDER.length - 1) {
    return 'review'
  }
  return CHAT_STEP_ORDER[currentIndex + 1]
}

function getPreviousStepId(currentStepId: ChatStepId): ChatStepId {
  const currentIndex = CHAT_STEP_ORDER.indexOf(currentStepId)
  if (currentIndex <= 0) {
    return CHAT_STEP_ORDER[0]
  }
  return CHAT_STEP_ORDER[currentIndex - 1]
}

// --- Initial state ---

function createInitialState(): GuidedChatState {
  const firstStep = CHAT_STEP_ORDER[0]
  return {
    currentStepId: firstStep,
    draft: createEmptyDraft(),
    messages: [
      createMessage('bot', CHAT_STEP_BOT_MESSAGES[firstStep], firstStep),
    ],
    isSubmitting: false,
    isGeneratingDescription: false,
    editingFromReview: false,
  }
}

// --- Reducer ---

export function guidedChatReducer(
  state: GuidedChatState,
  action: GuidedChatAction
): GuidedChatState {
  switch (action.type) {
    case 'SET_FIELD_VALUE': {
      return {
        ...state,
        draft: {
          ...state.draft,
          [action.field]: action.value,
        },
      }
    }

    case 'GO_TO_STEP': {
      return {
        ...state,
        currentStepId: action.stepId,
        messages: [
          ...state.messages,
          createMessage('bot', CHAT_STEP_BOT_MESSAGES[action.stepId], action.stepId),
        ],
      }
    }

    case 'GO_TO_NEXT_STEP': {
      const nextStepId = getNextStepId(state.currentStepId)
      return {
        ...state,
        currentStepId: nextStepId,
        messages: [
          ...state.messages,
          createMessage('user', action.userMessage, state.currentStepId),
          createMessage('bot', CHAT_STEP_BOT_MESSAGES[nextStepId], nextStepId),
        ],
      }
    }

    case 'GO_TO_PREVIOUS_STEP': {
      const prevStepId = getPreviousStepId(state.currentStepId)
      return {
        ...state,
        currentStepId: prevStepId,
      }
    }

    case 'GO_TO_REVIEW': {
      return {
        ...state,
        currentStepId: 'review',
        editingFromReview: false,
        messages: [
          ...state.messages,
          createMessage('user', action.userMessage, state.currentStepId),
          createMessage('bot', CHAT_STEP_BOT_MESSAGES['review'], 'review'),
        ],
      }
    }

    case 'EDIT_FROM_REVIEW': {
      return {
        ...state,
        currentStepId: action.stepId,
        editingFromReview: true,
        messages: [
          ...state.messages,
          createMessage('bot', `Vous pouvez modifier : ${CHAT_STEP_BOT_MESSAGES[action.stepId]}`, action.stepId),
        ],
      }
    }

    case 'RETURN_FROM_EDIT': {
      return {
        ...state,
        currentStepId: 'review',
        editingFromReview: false,
        messages: [
          ...state.messages,
          createMessage('user', action.userMessage, state.currentStepId),
          createMessage('bot', 'Modification enregistrée. Voici le récapitulatif mis à jour.', 'review'),
        ],
      }
    }

    case 'ADD_BOT_MESSAGE': {
      return {
        ...state,
        messages: [
          ...state.messages,
          createMessage('bot', action.content, state.currentStepId),
        ],
      }
    }

    case 'ADD_USER_MESSAGE': {
      return {
        ...state,
        messages: [
          ...state.messages,
          createMessage('user', action.content, state.currentStepId),
        ],
      }
    }

    case 'SET_SUBMITTING': {
      return { ...state, isSubmitting: action.value }
    }

    case 'SET_GENERATING_DESCRIPTION': {
      return { ...state, isGeneratingDescription: action.value }
    }

    case 'SKIP_STEP': {
      const nextStepId = getNextStepId(action.stepId)
      return {
        ...state,
        currentStepId: nextStepId,
        messages: [
          ...state.messages,
          createMessage('user', '(Passé)', state.currentStepId),
          createMessage('bot', CHAT_STEP_BOT_MESSAGES[nextStepId], nextStepId),
        ],
      }
    }

    default:
      return state
  }
}

// --- Hook ---

export function useGuidedChatState() {
  const [state, dispatch] = useReducer(guidedChatReducer, undefined, createInitialState)

  const actions = {
    setFieldValue: useCallback(
      <K extends keyof GuidedChatDraft>(field: K, value: GuidedChatDraft[K]) =>
        dispatch({ type: 'SET_FIELD_VALUE', field, value }),
      []
    ),

    goToStep: useCallback(
      (stepId: ChatStepId) => dispatch({ type: 'GO_TO_STEP', stepId }),
      []
    ),

    goToNextStep: useCallback(
      (userMessage: string) => dispatch({ type: 'GO_TO_NEXT_STEP', userMessage }),
      []
    ),

    goToPreviousStep: useCallback(
      () => dispatch({ type: 'GO_TO_PREVIOUS_STEP' }),
      []
    ),

    goToReview: useCallback(
      (userMessage: string) => dispatch({ type: 'GO_TO_REVIEW', userMessage }),
      []
    ),

    editFromReview: useCallback(
      (stepId: ChatStepId) => dispatch({ type: 'EDIT_FROM_REVIEW', stepId }),
      []
    ),

    returnFromEdit: useCallback(
      (userMessage: string) => dispatch({ type: 'RETURN_FROM_EDIT', userMessage }),
      []
    ),

    addBotMessage: useCallback(
      (content: string) => dispatch({ type: 'ADD_BOT_MESSAGE', content }),
      []
    ),

    addUserMessage: useCallback(
      (content: string) => dispatch({ type: 'ADD_USER_MESSAGE', content }),
      []
    ),

    setSubmitting: useCallback(
      (value: boolean) => dispatch({ type: 'SET_SUBMITTING', value }),
      []
    ),

    setGeneratingDescription: useCallback(
      (value: boolean) => dispatch({ type: 'SET_GENERATING_DESCRIPTION', value }),
      []
    ),

    skipStep: useCallback(
      (stepId: ChatStepId) => dispatch({ type: 'SKIP_STEP', stepId }),
      []
    ),
  }

  return { state, actions }
}
