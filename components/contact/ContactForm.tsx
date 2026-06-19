'use client'

import { useActionState, useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { submitContactForm } from '@/app/actions/contact'
import { sendContactFormSuccess } from '@/lib/gtm'
import EmailChangeNotice from '@/components/support/EmailChangeNotice'
import { COMMERCIAL_SUBJECTS, SUPPORT_SUBJECTS, type ContactSource } from '@/lib/validations/contact'

const EMAIL_CHANGE_SUBJECT = 'Compte — changement d\'email'

type ContactFormProps = {
  source?: ContactSource
  userId?: string
  companyId?: string
  usecaseId?: string
  defaultEmail?: string
  defaultFirstName?: string
  defaultLastName?: string
  alwaysExpanded?: boolean
}

type ContactFormState = {
  success?: boolean
  errors?: Partial<Record<string, string[]>>
  error?: string
}

const initialState: ContactFormState = {}

const inputClassName =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:border-[#0080A3] focus-visible:outline-none transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500'

const lockedInputClassName =
  'bg-slate-50 text-slate-500 cursor-not-allowed focus-visible:ring-0 focus-visible:border-gray-300'

function isPrefilledValue(value?: string): boolean {
  return Boolean(value?.trim())
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p id={id} className="mt-1 text-sm text-red-600" role="alert">
      {messages.join(', ')}
    </p>
  )
}

export default function ContactForm({
  source = 'contact_page',
  userId,
  companyId,
  usecaseId,
  defaultEmail,
  defaultFirstName,
  defaultLastName,
  alwaysExpanded,
}: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState)
  const [subject, setSubject] = useState('')

  const isAuthenticatedContext = source === 'dashboard_support'
  const isFirstNameLocked = isAuthenticatedContext && isPrefilledValue(defaultFirstName)
  const isLastNameLocked = isAuthenticatedContext && isPrefilledValue(defaultLastName)
  const isEmailLocked = isAuthenticatedContext && isPrefilledValue(defaultEmail)
  const showEmailSecurityHelp = isEmailLocked

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
  const emailHasError = Boolean(fieldErrors.email)
  const emailDescribedBy = showEmailSecurityHelp
    ? emailHasError
      ? 'email-error email-security-help'
      : 'email-security-help'
    : emailHasError
      ? 'email-error'
      : undefined

  // Détermination de la liste des motifs selon le contexte de la page
  const subjectsToDisplay = source === 'contact_page' ? COMMERCIAL_SUBJECTS : SUPPORT_SUBJECTS

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

      <div>
        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-gray-700">
          Motif de la demande <span className="text-red-500">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          required
          aria-required="true"
          defaultValue=""
          disabled={isPending}
          className={inputClassName}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
          onChange={(event) => setSubject(event.target.value)}
        >
          <option value="" disabled>
            Sélectionnez un motif
          </option>
          {subjectsToDisplay.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FieldError id="subject-error" messages={fieldErrors.subject} />
      </div>

      {subject !== '' || alwaysExpanded ? (
        <div className="animate-in fade-in slide-in-from-top-4 mt-5 space-y-5 border-t border-slate-100 pt-5 duration-500 ease-out">
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
            aria-required="true"
            minLength={2}
            autoComplete="given-name"
            disabled={isPending}
            readOnly={isFirstNameLocked}
            className={`${inputClassName} ${isFirstNameLocked ? lockedInputClassName : ''}`}
            placeholder="Jean"
            defaultValue={defaultFirstName}
            aria-invalid={Boolean(fieldErrors.first_name)}
            aria-describedby={fieldErrors.first_name ? 'first_name-error' : undefined}
          />
          <FieldError id="first_name-error" messages={fieldErrors.first_name} />
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
            aria-required="true"
            minLength={2}
            autoComplete="family-name"
            disabled={isPending}
            readOnly={isLastNameLocked}
            className={`${inputClassName} ${isLastNameLocked ? lockedInputClassName : ''}`}
            placeholder="Dupont"
            defaultValue={defaultLastName}
            aria-invalid={Boolean(fieldErrors.last_name)}
            aria-describedby={fieldErrors.last_name ? 'last_name-error' : undefined}
          />
          <FieldError id="last_name-error" messages={fieldErrors.last_name} />
        </div>
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
          aria-required="true"
          autoComplete="email"
          disabled={isPending}
          readOnly={isEmailLocked}
          className={`${inputClassName} ${isEmailLocked ? lockedInputClassName : ''}`}
          placeholder="vous@entreprise.com"
          defaultValue={defaultEmail}
          aria-invalid={emailHasError}
          aria-describedby={emailDescribedBy}
        />
        {showEmailSecurityHelp ? (
          <p
            id="email-security-help"
            className="mt-2 flex items-start gap-1.5 font-sans text-sm text-slate-500 sm:items-center"
          >
            <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            Adresse sécurisée liée à votre session. Utilisez le menu déroulant ci-dessus pour
            demander une modification.
          </p>
        ) : null}
        <FieldError id="email-error" messages={fieldErrors.email} />
      </div>

      {subject === EMAIL_CHANGE_SUBJECT ? (
        <EmailChangeNotice />
      ) : null}

      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
          Téléphone
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
          aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
        />
        <FieldError id="phone-error" messages={fieldErrors.phone} />
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          disabled={isPending}
          className={`${inputClassName} resize-none`}
          placeholder="Décrivez votre demande..."
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'message-error' : undefined}
        />
        <FieldError id="message-error" messages={fieldErrors.message} />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="marketing_consent"
          name="marketing_consent"
          type="checkbox"
          value="on"
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0080A3] focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:outline-none"
          aria-invalid={Boolean(fieldErrors.marketing_consent)}
          aria-describedby={fieldErrors.marketing_consent ? 'marketing_consent-error' : undefined}
        />
        <label htmlFor="marketing_consent" className="text-sm text-gray-600 leading-relaxed">
          J&apos;accepte de recevoir des communications marketing de MaydAI.
        </label>
      </div>
      <FieldError id="marketing_consent-error" messages={fieldErrors.marketing_consent} />

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="w-full rounded-lg bg-[#0080A3] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#006280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Envoi en cours…' : 'Envoyer le message'}
      </button>
        </div>
      ) : null}
    </form>
  )
}
