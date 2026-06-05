'use client'

import { useActionState, useEffect } from 'react'
import { submitContactForm } from '@/app/actions/contact'
import { sendContactFormSuccess } from '@/lib/gtm'
import { CONTACT_SUBJECT_OPTIONS, type ContactSource } from '@/lib/validations/contact'

type ContactFormProps = {
  source?: ContactSource
  userId?: string
  companyId?: string
  usecaseId?: string
}

type ContactFormState = {
  success?: boolean
  errors?: Partial<Record<string, string[]>>
  error?: string
}

const initialState: ContactFormState = {}

const inputClassName =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500'

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {messages.join(', ')}
    </p>
  )
}

export default function ContactForm({
  source = 'contact_page',
  userId,
  companyId,
  usecaseId,
}: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState)

  useEffect(() => {
    if (state?.success) {
      sendContactFormSuccess()
    }
  }, [state?.success])

  if (state?.success) {
    return (
      <div
        className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm"
        role="status"
      >
        <h2 className="text-xl font-semibold text-green-900 mb-2">Message envoyé</h2>
        <p className="text-green-800 text-sm leading-relaxed">
          Merci pour votre prise de contact. Notre équipe reviendra vers vous dans les meilleurs
          délais.
        </p>
      </div>
    )
  }

  const fieldErrors = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="source" value={source} />
      {userId ? <input type="hidden" name="user_id" value={userId} /> : null}
      {companyId ? <input type="hidden" name="company_id" value={companyId} /> : null}
      {usecaseId ? <input type="hidden" name="usecase_id" value={usecaseId} /> : null}

      {state?.error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="mb-2 block text-sm font-medium text-gray-700">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            minLength={2}
            autoComplete="given-name"
            disabled={isPending}
            className={inputClassName}
            placeholder="Jean"
            aria-invalid={Boolean(fieldErrors.first_name)}
          />
          <FieldError messages={fieldErrors.first_name} />
        </div>

        <div>
          <label htmlFor="last_name" className="mb-2 block text-sm font-medium text-gray-700">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            minLength={2}
            autoComplete="family-name"
            disabled={isPending}
            className={inputClassName}
            placeholder="Dupont"
            aria-invalid={Boolean(fieldErrors.last_name)}
          />
          <FieldError messages={fieldErrors.last_name} />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-gray-700">
          Objet de la demande <span className="text-red-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          required
          defaultValue=""
          disabled={isPending}
          className={inputClassName}
          aria-invalid={Boolean(fieldErrors.subject)}
        >
          <option value="" disabled>
            Sélectionnez un motif
          </option>
          {CONTACT_SUBJECT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FieldError messages={fieldErrors.subject} />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          className={inputClassName}
          placeholder="vous@entreprise.com"
          aria-invalid={Boolean(fieldErrors.email)}
        />
        <FieldError messages={fieldErrors.email} />
      </div>

      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
          Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          disabled={isPending}
          className={inputClassName}
          placeholder="+33 6 12 34 56 78"
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        <FieldError messages={fieldErrors.phone} />
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
          Message <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          disabled={isPending}
          className={`${inputClassName} resize-none`}
          placeholder="Décrivez votre demande..."
          aria-invalid={Boolean(fieldErrors.message)}
        />
        <FieldError messages={fieldErrors.message} />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="marketing_consent"
          name="marketing_consent"
          type="checkbox"
          value="on"
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0080A3] focus:ring-[#0080A3]"
          aria-invalid={Boolean(fieldErrors.marketing_consent)}
        />
        <label htmlFor="marketing_consent" className="text-sm text-gray-600 leading-relaxed">
          J&apos;accepte de recevoir des communications marketing de MaydAI.
        </label>
      </div>
      <FieldError messages={fieldErrors.marketing_consent} />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#0080A3] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#006280] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Envoi en cours…' : 'Envoyer le message'}
      </button>
    </form>
  )
}
