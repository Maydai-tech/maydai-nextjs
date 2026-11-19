'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, Send, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { INDUSTRIES_LIST } from '@/lib/constants/industries'
import {
  CONFIRM_COMPANY_PROFILE_TOOL_NAME,
  buildCompanyProfileConfirmationMessage,
  buildWelcomeRecapMessage,
  findIndustryFamily,
  getWelcomeCollectStep,
  resolveIndustryForStorage,
  resolveSubCategoryForStorage,
  type CompanyProfileChatApiResponse,
  type CompanyProfileFields,
  type CompanyProfileSources,
  type CompanyProfileToolCallResponse,
} from '@/lib/mistral/company-profile-tool'

type ChatRole = 'user' | 'assistant'

interface ConversationMessage {
  id: string
  role: ChatRole
  content: string
}

const COUNTRY_QUICK_REPLIES = [
  'France',
  'Belgique',
  'Allemagne',
  'Espagne',
  'Italie',
  'Pays-Bas',
  'Luxembourg',
  'Suisse',
] as const

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function assistantPromptForStep(step: ReturnType<typeof getWelcomeCollectStep>): string {
  if (step === 'sub_category') return 'Choisissez le sous-secteur d’activité :'
  if (step === 'country') return 'Quel est le pays d’établissement ?'
  if (step === 'address') {
    return 'Indiquez l’adresse exacte de l’entreprise ou de la filiale (rue, code postal, ville). C’est obligatoire pour valider le profil.'
  }
  return 'Vérifiez le récapitulatif, puis validez pour enregistrer ces informations sur le registre.'
}

function isProfileConfirmedResponse(
  payload: CompanyProfileChatApiResponse
): payload is CompanyProfileToolCallResponse {
  return payload.type === 'TOOL_CALL' && payload.profileConfirmed === true
}

interface WelcomeChatInterviewerProps {
  className?: string
  companyId: string
  profile: CompanyProfileFields
  sources?: CompanyProfileSources
  onProfileConfirmed: (savedProfile: CompanyProfileFields) => void
}

export default function WelcomeChatInterviewer({
  className = '',
  companyId,
  profile,
  sources,
  onProfileConfirmed,
}: WelcomeChatInterviewerProps) {
  const { session } = useAuth()
  const [draft, setDraft] = useState<CompanyProfileFields>(profile)
  const [messages, setMessages] = useState<ConversationMessage[]>(() => [
    {
      id: 'welcome-recap',
      role: 'assistant',
      content: buildWelcomeRecapMessage(profile, sources),
    },
  ])
  const [input, setInput] = useState('')
  const [streetInput, setStreetInput] = useState(profile.street_address ?? '')
  const [postalInput, setPostalInput] = useState(profile.postal_code ?? '')
  const [cityInput, setCityInput] = useState(profile.city ?? '')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const onConfirmedRef = useRef(onProfileConfirmed)
  onConfirmedRef.current = onProfileConfirmed

  const collectStep = getWelcomeCollectStep(draft)
  const subCategoryReplies = useMemo(() => {
    return findIndustryFamily(draft.industry)?.subCategories.map((item) => item.label) ?? []
  }, [draft.industry])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending, collectStep])

  const appendLocal = useCallback((userText: string, assistantText: string) => {
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: userText },
      { id: newId(), role: 'assistant', content: assistantText },
    ])
  }, [])

  const sendText = useCallback(
    async (text: string, historyOverride?: ConversationMessage[]) => {
      const trimmed = text.trim()
      if (!trimmed || isPending || confirmed) return

      const token = session?.access_token
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const userMessage: ConversationMessage = { id: newId(), role: 'user', content: trimmed }
      const nextHistory = [...(historyOverride ?? messages), userMessage]
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
            phase: 'welcome',
            company_id: companyId,
            messages: nextHistory.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        })

        const payload = (await response.json()) as CompanyProfileChatApiResponse & {
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || `Erreur ${response.status}`)
        }

        if (isProfileConfirmedResponse(payload) && payload.tool === CONFIRM_COMPANY_PROFILE_TOOL_NAME) {
          setConfirmed(true)
          onConfirmedRef.current(payload.savedProfile ?? draft)
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
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Impossible de contacter l’assistant. Réessayez.'
        setError(message)
      } finally {
        setIsPending(false)
        inputRef.current?.focus()
      }
    },
    [companyId, confirmed, draft, isPending, messages, session?.access_token]
  )

  const selectIndustry = (label: string) => {
    if (isPending || confirmed) return
    const industry = resolveIndustryForStorage(label)
    const next = { ...draft, industry, sub_category_id: null }
    setDraft(next)
    appendLocal(label, assistantPromptForStep(getWelcomeCollectStep(next)))
  }

  const selectSubCategory = (label: string) => {
    if (isPending || confirmed) return
    const subCategory = resolveSubCategoryForStorage(draft.industry, label)
    const next = { ...draft, sub_category_id: subCategory }
    setDraft(next)
    appendLocal(label, assistantPromptForStep(getWelcomeCollectStep(next)))
  }

  const selectCountry = (label: string) => {
    if (isPending || confirmed) return
    const next = { ...draft, country: label }
    setDraft(next)
    appendLocal(label, assistantPromptForStep(getWelcomeCollectStep(next)))
  }

  const submitAddress = () => {
    if (isPending || confirmed) return
    const street = streetInput.trim()
    const postal = postalInput.trim()
    const city = cityInput.trim()
    if (!street || !postal || !city) {
      setError('Rue, code postal et ville sont obligatoires.')
      return
    }
    setError('')
    setDraft((prev) => ({
      ...prev,
      street_address: street,
      postal_code: postal,
      city,
    }))
    appendLocal(
      `${street}, ${postal} ${city}`,
      'Vérifiez le récapitulatif, puis validez pour enregistrer ces informations sur le registre.'
    )
  }

  const confirmProfile = () => {
    const nextDraft = {
      ...draft,
      street_address: (draft.street_address ?? streetInput.trim()) || null,
      postal_code: (draft.postal_code ?? postalInput.trim()) || null,
      city: (draft.city ?? cityInput.trim()) || null,
    }
    void sendText(buildCompanyProfileConfirmationMessage(nextDraft))
  }

  const sendMessage = useCallback(async () => {
    await sendText(input)
  }, [input, sendText])

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className={`flex min-h-[70vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">Accueil — profil entreprise</p>
        <p className="text-xs text-gray-500">Confirmez l’identité de l’opérateur avant le cadrage</p>
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
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 ${
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

        {!confirmed && !isPending && collectStep === 'industry' && (
          <QuickReplyGroup
            label="Secteur"
            options={INDUSTRIES_LIST.map((item) => item.label)}
            onSelect={selectIndustry}
          />
        )}

        {!confirmed && !isPending && collectStep === 'sub_category' && subCategoryReplies.length > 0 && (
          <QuickReplyGroup
            label="Sous-secteur"
            options={subCategoryReplies}
            onSelect={selectSubCategory}
          />
        )}

        {!confirmed && !isPending && collectStep === 'country' && (
          <QuickReplyGroup
            label="Pays d’établissement"
            options={[...COUNTRY_QUICK_REPLIES]}
            onSelect={selectCountry}
          />
        )}

        {!confirmed && !isPending && collectStep === 'address' && (
          <AddressFields
            street={streetInput}
            postal={postalInput}
            city={cityInput}
            onStreetChange={setStreetInput}
            onPostalChange={setPostalInput}
            onCityChange={setCityInput}
            onSubmit={submitAddress}
          />
        )}

        {!confirmed && !isPending && collectStep === 'confirm' && (
          <div className="rounded-xl border border-[#0080A3]/20 bg-[#0080A3]/5 p-4">
            <p className="text-sm text-gray-700">
              Tout est renseigné. Validez pour enregistrer ce profil sur le registre.
            </p>
            <button
              type="button"
              onClick={confirmProfile}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#0080A3] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#006280] sm:w-auto"
            >
              Valider le profil
            </button>
          </div>
        )}

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
          <label htmlFor="welcome-chat-input" className="sr-only">
            Votre message
          </label>
          <textarea
            id="welcome-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={isPending || confirmed}
            placeholder={
              confirmed
                ? 'Profil confirmé'
                : collectStep === 'address'
                  ? 'Ou saisissez l’adresse en une ligne…'
                  : 'Corriger une valeur déjà proposée…'
            }
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={isPending || confirmed || !input.trim()}
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
    </div>
  )
}

function AddressFields({
  street,
  postal,
  city,
  onStreetChange,
  onPostalChange,
  onCityChange,
  onSubmit,
}: {
  street: string
  postal: string
  city: string
  onStreetChange: (value: string) => void
  onPostalChange: (value: string) => void
  onCityChange: (value: string) => void
  onSubmit: () => void
}) {
  const canSubmit = street.trim() && postal.trim() && city.trim()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Adresse exacte
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs text-gray-500">Rue</span>
          <input
            type="text"
            value={street}
            onChange={(event) => onStreetChange(event.target.value)}
            placeholder="10 rue de la Paix"
            autoComplete="street-address"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-gray-500">Code postal</span>
          <input
            type="text"
            value={postal}
            onChange={(event) => onPostalChange(event.target.value)}
            placeholder="75002"
            autoComplete="postal-code"
            inputMode="numeric"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-gray-500">Ville</span>
          <input
            type="text"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            placeholder="Paris"
            autoComplete="address-level2"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3]/30"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#0080A3] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        Enregistrer l’adresse
      </button>
    </div>
  )
}

function QuickReplyGroup({
  label,
  options,
  onSelect,
}: {
  label: string
  options: string[]
  onSelect: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className="rounded-full border border-[#0080A3]/30 bg-white px-3 py-1.5 text-left text-xs font-medium text-[#006280] transition hover:border-[#0080A3] hover:bg-[#0080A3]/5 sm:text-sm"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
