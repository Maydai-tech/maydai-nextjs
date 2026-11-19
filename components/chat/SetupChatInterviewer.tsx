'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, Send, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Toast from '@/components/Toast'
import { DEPLOYMENT_PHASE_LABELS, type DeploymentPhaseKey } from '@/lib/deployment-phase'
import {
  SAVE_USECASE_SETUP_TOOL_NAME,
  type SetupChatApiResponse,
  type SetupChatToolCallResponse,
  type UseCaseSetupInsert,
} from '@/lib/mistral/setup-tool'
import { useCaseRoutes } from '@/app/(saas)/usecases/[id]/utils/routes'

type ChatRole = 'user' | 'assistant'

interface ConversationMessage {
  id: string
  role: ChatRole
  content: string
}

const WELCOME_MESSAGE =
  'Le profil de votre organisation est enregistré. Commençons le brouillon du cas d’usage.\n\nQuel est le nom de ce système / cas d’usage IA ?'

const SUCCESS_MESSAGE =
  'Merci ! Vos informations sont enregistrées. Redirection vers l’évaluation dans 3 secondes…'

const REDIRECT_DELAY_MS = 3000

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isCompletedSetupToolCall(
  payload: SetupChatApiResponse
): payload is SetupChatToolCallResponse {
  return (
    payload.type === 'TOOL_CALL' &&
    payload.tool === SAVE_USECASE_SETUP_TOOL_NAME &&
    payload.setupComplete === true &&
    typeof payload.usecase_id === 'string' &&
    payload.usecase_id.trim().length > 0
  )
}

function formatPhase(phase: DeploymentPhaseKey): string {
  return DEPLOYMENT_PHASE_LABELS[phase] ?? phase
}

interface SetupChatInterviewerProps {
  className?: string
  companyId: string
}

export default function SetupChatInterviewer({ className = '', companyId }: SetupChatInterviewerProps) {
  const { session } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [setupData, setSetupData] = useState<UseCaseSetupInsert | null>(null)
  const [usecaseId, setUsecaseId] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const setupComplete = setupData !== null

  const reportError = useCallback((error: unknown, fallback: string) => {
    console.error('[SetupChatInterviewer]', error)
    const message = error instanceof Error && error.message.trim() ? error.message : fallback
    setError(message)
    setToastMessage(message)
    setToastVisible(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending, setupData])

  useEffect(() => {
    if (!usecaseId) return
    const nextUrl = useCaseRoutes.chatEvaluation(usecaseId)
    const timeoutId = window.setTimeout(() => {
      router.push(nextUrl)
    }, REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [usecaseId, router])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isPending || setupComplete) return

    if (!companyId.trim()) {
      reportError(
        new Error('Identifiant de registre manquant.'),
        'Identifiant de registre manquant.'
      )
      return
    }

    const token = session?.access_token
    if (!token) {
      reportError(
        new Error('Session expirée. Veuillez vous reconnecter.'),
        'Session expirée. Veuillez vous reconnecter.'
      )
      return
    }

    const userMessage: ConversationMessage = { id: newId(), role: 'user', content: text }
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setInput('')
    setError('')
    setIsPending(true)

    try {
      const response = await fetch('/api/chat/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phase: 'setup',
          company_id: companyId,
          messages: nextHistory.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const payload = (await response.json()) as SetupChatApiResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || `Erreur ${response.status}`)
      }

      if (isCompletedSetupToolCall(payload)) {
        setSetupData(payload.data)
        setUsecaseId(payload.usecase_id)
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: SUCCESS_MESSAGE },
        ])
        return
      }

      if (payload.type === 'MESSAGE' && payload.content) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'assistant', content: payload.content },
        ])
        return
      }

      throw new Error('Réponse inattendue de l’assistant')
    } catch (error) {
      reportError(error, 'Impossible de contacter l’assistant. Réessayez.')
    } finally {
      setIsPending(false)
      inputRef.current?.focus()
    }
  }, [companyId, input, isPending, messages, reportError, session?.access_token, setupComplete])

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div
      className={`flex min-h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
      aria-busy={isPending}
    >
      <Toast
        message={toastMessage}
        type="error"
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        duration={7000}
      />
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">Assistant de cadrage</p>
        <p className="text-xs text-gray-500">9 informations avant l’évaluation AI Act</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
        {messages.map((message) => {
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
                className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 ${
                  isAssistant
                    ? 'border border-gray-200 bg-gray-50 text-gray-800'
                    : 'bg-[#0080A3] text-white'
                }`}
              >
                {message.content}
              </div>
            </div>
          )
        })}

        {isPending && (
          <div className="flex gap-2 sm:gap-3" data-testid="setup-chat-pending" role="status">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080A3]/10">
              <Bot className="h-4 w-4 text-[#0080A3]" aria-hidden />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#0080A3]" aria-hidden />
              L’assistant réfléchit…
            </div>
          </div>
        )}

        {setupData && <SetupSummary data={setupData} />}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form
        className="border-t border-gray-100 p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void sendMessage()
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="setup-chat-input" className="sr-only">
            Votre message
          </label>
          <textarea
            id="setup-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={isPending || setupComplete}
            placeholder={
              setupComplete ? 'Cadrage terminé' : 'Décrivez votre cas d’usage…'
            }
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={isPending || setupComplete || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0080A3] text-white transition hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Envoyer"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" data-testid="setup-chat-send-loader" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function SetupSummary({ data }: { data: UseCaseSetupInsert }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Nom', value: data.name },
    { label: 'Description', value: data.description },
    { label: 'Phase', value: formatPhase(data.deployment_phase) },
    { label: 'Service', value: data.responsible_service },
    { label: 'Catégorie IA', value: data.ai_category },
    { label: 'Type de système', value: data.system_type },
    { label: 'Pays de déploiement', value: data.deployment_countries.join(', ') },
    { label: 'Date de mise en service', value: data.deployment_date?.trim() || 'Non renseignée' },
    { label: 'Partenaire', value: data.technology_partner },
    { label: 'Modèle', value: data.llm_model_version },
  ]

  return (
    <div className="rounded-xl border border-[#0080A3]/20 bg-[#0080A3]/5 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#006280]">
        Synthèse du cadrage
      </p>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[8.5rem_1fr] sm:gap-3">
            <dt className="font-medium text-gray-500">{row.label}</dt>
            <dd className="text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
