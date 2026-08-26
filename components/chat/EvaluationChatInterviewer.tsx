'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  EVALUATION_BOTH_OPTION_LABEL,
  combinableEvaluationOptions,
  formatEvaluationCheckboxReply,
  formatEvaluationQuestionForChat,
  hasBothEvaluationShortcut,
  isMultiSelectEvaluationQuestion,
  isPersonaQuestionId,
  toggleEvaluationCheckboxCode,
  type EvaluationChatApiResponse,
  type EvaluationQuestionNode,
} from '@/lib/mistral/evaluation-tool'
import {
  buildResumedEvaluationMessages,
  evaluationChatStorageKey,
  parseStoredEvaluationMessages,
  serializeStoredEvaluationMessages,
  type EvaluationChatMessage,
} from '@/lib/mistral/evaluation-chat-session'

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface EvaluationChatInterviewerProps {
  className?: string
  usecaseId: string
  industryLabel: string
  usecaseName?: string | null
  usecaseDescription?: string | null
  /** Appelé une seule fois quand le graphe V3 renvoie PATH_COMPLETE. */
  onPathComplete?: () => void
}

export default function EvaluationChatInterviewer({
  className = '',
  usecaseId,
  industryLabel,
  usecaseName = null,
  usecaseDescription = null,
  onPathComplete,
}: EvaluationChatInterviewerProps) {
  const { session } = useAuth()
  const [messages, setMessages] = useState<EvaluationChatMessage[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [input, setInput] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [pathComplete, setPathComplete] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<EvaluationQuestionNode | null>(null)
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const followUpLock = useRef(false)
  const pathCompleteNotified = useRef(false)
  const onPathCompleteRef = useRef(onPathComplete)
  onPathCompleteRef.current = onPathComplete

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending, selectedCodes])

  useEffect(() => {
    setSelectedCodes([])
  }, [currentQuestion?.id])

  useEffect(() => {
    if (!hydrated || messages.length === 0) return
    try {
      window.localStorage.setItem(
        evaluationChatStorageKey(usecaseId),
        serializeStoredEvaluationMessages(messages)
      )
    } catch {
      // Quota / mode privé : la reprise se fera via les réponses en base.
    }
  }, [hydrated, messages, usecaseId])

  useEffect(() => {
    if (!usecaseId || !session?.access_token) return

    let cancelled = false

    const hydrate = async () => {
      const token = session.access_token
      let stored: EvaluationChatMessage[] | null = null
      try {
        stored = parseStoredEvaluationMessages(
          window.localStorage.getItem(evaluationChatStorageKey(usecaseId))
        )
      } catch {
        stored = null
      }

      try {
        const response = await fetch(
          `/api/chat/evaluation?usecase_id=${encodeURIComponent(usecaseId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const payload = (await response.json()) as EvaluationChatApiResponse & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || `Erreur ${response.status}`)
        }
        if (cancelled) return

        if (payload.type === 'PATH_COMPLETE') {
          const resumed = buildResumedEvaluationMessages({
            stored,
            industryLabel,
            name: usecaseName,
            description: usecaseDescription,
            step: { type: 'complete' },
          })
          setMessages(resumed.messages)
          setCurrentQuestion(null)
          setPathComplete(true)
          if (!pathCompleteNotified.current) {
            pathCompleteNotified.current = true
            onPathCompleteRef.current?.()
          }
          return
        }

        if (payload.type === 'NEW_QUESTION_NODE') {
          const resumed = buildResumedEvaluationMessages({
            stored,
            industryLabel,
            name: usecaseName,
            description: usecaseDescription,
            step: { type: 'question', question: payload.question },
          })
          setMessages(resumed.messages)
          setCurrentQuestion(payload.question)
          return
        }

        const resumed = buildResumedEvaluationMessages({
          stored,
          industryLabel,
          name: usecaseName,
          description: usecaseDescription,
          step: { type: 'not_started' },
        })
        setMessages(resumed.messages)
      } catch (err) {
        if (cancelled) return
        const resumed = buildResumedEvaluationMessages({
          stored,
          industryLabel,
          name: usecaseName,
          description: usecaseDescription,
          step: { type: 'not_started' },
        })
        setMessages(resumed.messages)
        setError(
          err instanceof Error ? err.message : 'Impossible de reprendre l’évaluation.'
        )
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [industryLabel, session?.access_token, usecaseDescription, usecaseId, usecaseName])

  const postEvaluation = useCallback(
    async (history: EvaluationChatMessage[], token: string): Promise<void> => {
      const response = await fetch('/api/chat/evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          usecase_id: usecaseId,
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const payload = (await response.json()) as EvaluationChatApiResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || `Erreur ${response.status}`)
      }

      if (payload.type === 'NEW_QUESTION_NODE') {
        setCurrentQuestion(payload.question)
        if (isPersonaQuestionId(payload.question.id)) {
          return
        }
        const content = formatEvaluationQuestionForChat(payload.question)
        const lastAssistant = [...history]
          .reverse()
          .find((message) => message.role === 'assistant')
        const lastIsUser = history[history.length - 1]?.role === 'user'
        if (lastAssistant?.content === content) {
          if (!lastIsUser) return
          setMessages([
            ...history,
            {
              id: newId(),
              role: 'assistant',
              content:
                'Merci. Je n’ai pas pu enregistrer cette réponse telle quelle — merci de choisir une option ci-dessous.',
            },
          ])
          return
        }
        setMessages([
          ...history,
          {
            id: newId(),
            role: 'assistant',
            content,
          },
        ])
        return
      }

      if (payload.type === 'PATH_COMPLETE') {
        setPathComplete(true)
        setCurrentQuestion(null)
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: 'Le moteur de conformité a toutes les réponses de cette étape. Merci.',
          },
        ])
        if (!pathCompleteNotified.current) {
          pathCompleteNotified.current = true
          onPathComplete?.()
        }
        return
      }

      if (payload.type === 'MESSAGE' && payload.content) {
        setMessages([
          ...history,
          { id: newId(), role: 'assistant', content: payload.content },
        ])
        return
      }

      throw new Error('Réponse inattendue de l’assistant')
    },
    [onPathComplete, usecaseId]
  )

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isPending || pathComplete || !hydrated || followUpLock.current) return

      const token = session?.access_token
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const userMessage: EvaluationChatMessage = { id: newId(), role: 'user', content: trimmed }
      const nextHistory = [...messages, userMessage]
      setMessages(nextHistory)
      setInput('')
      setError('')
      setIsPending(true)
      followUpLock.current = true

      try {
        await postEvaluation(nextHistory, token)
      } catch (err) {
        console.error('[EvaluationChatInterviewer]', err)
        const message =
          err instanceof Error ? err.message : 'Impossible de contacter l’assistant. Réessayez.'
        setError(message)
      } finally {
        followUpLock.current = false
        setIsPending(false)
        inputRef.current?.focus()
      }
    },
    [hydrated, isPending, messages, pathComplete, postEvaluation, session?.access_token]
  )

  const sendMessage = useCallback(async () => {
    await sendText(input)
  }, [input, sendText])

  const confirmCheckboxSelection = useCallback(async () => {
    if (!currentQuestion || !isMultiSelectEvaluationQuestion(currentQuestion)) return
    const reply = formatEvaluationCheckboxReply(currentQuestion, selectedCodes)
    if (!reply) return
    await sendText(reply)
  }, [currentQuestion, selectedCodes, sendText])

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const isPersonaStep =
    !pathComplete && Boolean(currentQuestion && isPersonaQuestionId(currentQuestion.id))

  return (
    <div className={`flex min-h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">Évaluateur conformité</p>
        <p className="text-xs text-gray-500">Next.js oriente le graphe — Mistral pose les questions</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
        {!hydrated ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-[#0080A3]" />
              <p className="text-sm text-gray-600">Reprise de l’évaluation…</p>
            </div>
          </div>
        ) : (
          messages
            .filter((message) => message.role !== 'system')
            .map((message) => {
              const isAssistant = message.role === 'assistant'
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isAssistant ? 'bg-[#0080A3]/10' : 'bg-gray-100'
                    }`}
                  >
                    {isAssistant ? (
                      <Bot className="h-4 w-4 text-[#0080A3]" aria-hidden />
                    ) : (
                      <User className="h-4 w-4 text-gray-500" aria-hidden />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[80%] sm:px-4 ${
                      isAssistant
                        ? 'border border-gray-200 bg-gray-50 text-gray-800'
                        : 'bg-[#0080A3] text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              )
            })
        )}

        {isPending && (
          <div className="flex gap-2 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080A3]/10">
              <Bot className="h-4 w-4 text-[#0080A3]" aria-hidden />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#0080A3]" aria-hidden />
              L’assistant réfléchit…
            </div>
          </div>
        )}

        {!pathComplete && !isPending && currentQuestion && isPersonaQuestionId(currentQuestion.id) && (
          <div className="rounded-2xl border border-[#0080A3]/20 bg-[#0080A3]/5 p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900 sm:text-base">
              {currentQuestion.question}
            </p>
            {currentQuestion.description ? (
              <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                {currentQuestion.description}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => void sendText(option.label)}
                  className="min-h-11 w-full rounded-xl border border-[#0080A3]/30 bg-white px-4 py-3 text-left text-sm font-medium text-[#006280] shadow-sm transition hover:border-[#0080A3] hover:bg-[#0080A3]/10"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!pathComplete &&
          !isPending &&
          currentQuestion &&
          currentQuestion.options.length > 0 &&
          !isPersonaQuestionId(currentQuestion.id) &&
          isMultiSelectEvaluationQuestion(currentQuestion) && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cochez une ou plusieurs réponses
            </p>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedCodes.includes(option.code)
                return (
                  <button
                    key={option.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedCodes((current) =>
                        toggleEvaluationCheckboxCode(currentQuestion, current, option.code)
                      )
                    }
                    className={`min-h-11 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition sm:min-h-0 sm:text-sm ${
                      isSelected
                        ? 'border-[#0080A3] bg-[#0080A3] text-white'
                        : 'border-[#0080A3]/30 bg-white text-[#006280] hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
              {hasBothEvaluationShortcut(currentQuestion) ? (
                <button
                  type="button"
                  aria-pressed={
                    combinableEvaluationOptions(currentQuestion).every((option) =>
                      selectedCodes.includes(option.code)
                    ) && selectedCodes.length === 2
                  }
                  onClick={() =>
                    setSelectedCodes(
                      combinableEvaluationOptions(currentQuestion).map((option) => option.code)
                    )
                  }
                  className={`min-h-11 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition sm:min-h-0 sm:text-sm ${
                    combinableEvaluationOptions(currentQuestion).every((option) =>
                      selectedCodes.includes(option.code)
                    ) && selectedCodes.length === 2
                      ? 'border-[#0080A3] bg-[#0080A3] text-white'
                      : 'border-[#0080A3]/30 bg-white text-[#006280] hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                  }`}
                >
                  {EVALUATION_BOTH_OPTION_LABEL}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={selectedCodes.length === 0}
              onClick={() => void confirmCheckboxSelection()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0080A3] px-4 text-sm font-medium text-white transition hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Valider
            </button>
          </div>
        )}

        {!pathComplete &&
          !isPending &&
          currentQuestion &&
          currentQuestion.options.length > 0 &&
          !isPersonaQuestionId(currentQuestion.id) &&
          !isMultiSelectEvaluationQuestion(currentQuestion) && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Réponses
            </p>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => void sendText(option.label)}
                  className="rounded-full border border-[#0080A3]/30 bg-white px-3 py-1.5 text-left text-xs font-medium text-[#006280] transition hover:border-[#0080A3] hover:bg-[#0080A3]/5 sm:text-sm"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!isPersonaStep && (
        <form
          className="border-t border-gray-100 p-3 sm:p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage()
          }}
        >
          <div className="flex items-end gap-2">
            <label htmlFor="evaluation-chat-input" className="sr-only">
              Votre message
            </label>
            <textarea
              id="evaluation-chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              disabled={!hydrated || isPending || pathComplete}
              placeholder={
                pathComplete ? 'Parcours terminé' : 'Répondez à l’assistant…'
              }
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={!hydrated || isPending || pathComplete || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0080A3] text-white transition hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Envoyer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
