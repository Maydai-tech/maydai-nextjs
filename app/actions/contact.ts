'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendAdminContactNotification } from '@/lib/email/mailjet'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { contactSiteSchema, evaluateBotTrap } from '@/lib/validations/contact'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send'
const MAILJET_FROM_EMAIL = 'contact@maydai.io'

function readOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readOptionalUuid(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseMarketingConsent(value: FormDataEntryValue | null): boolean {
  if (value === null) return false
  if (typeof value === 'string') {
    return value === 'true' || value === 'on' || value === '1'
  }
  return false
}

function formDataToContactPayload(formData: FormData) {
  return {
    subject: formData.get('subject'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: readOptionalString(formData.get('phone')),
    message: readOptionalString(formData.get('message')),
    marketing_consent: parseMarketingConsent(formData.get('marketing_consent')),
    source: readOptionalString(formData.get('source')),
    user_id: readOptionalUuid(formData.get('user_id')),
    company_id: readOptionalUuid(formData.get('company_id')),
    usecase_id: readOptionalUuid(formData.get('usecase_id')),
  }
}

async function sendContactConfirmationEmail(data: {
  email: string
  first_name: string
  subject: string
  source: string
}): Promise<void> {
  const apiKey = process.env.MAILJET_API_KEY
  const apiSecret = process.env.MAILJET_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error(
      '[Action: Contact] Mailjet Notification Error:',
      'MAILJET_API_KEY ou MAILJET_API_SECRET manquant',
    )
    return
  }

  const templateId = data.source === 'contact_page' ? 8074397 : 8087654
  const fromName = data.source === 'contact_page' ? 'MaydAI' : 'Support MaydAI'

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const response = await fetch(MAILJET_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: MAILJET_FROM_EMAIL,
            Name: fromName,
          },
          To: [
            {
              Email: data.email,
              Name: data.first_name,
            },
          ],
          TemplateID: templateId,
          TemplateLanguage: true,
          Variables: {
            first_name: data.first_name,
            subject: data.subject,
          },
        },
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Mailjet confirmation failed (${response.status}): ${body}`)
  }
}

async function sendContactEmailsSafely(data: {
  email: string
  first_name: string
  last_name: string
  subject: string
  source: string
  phone?: string
  message?: string
}): Promise<void> {
  try {
    await sendContactConfirmationEmail({
      email: data.email,
      first_name: data.first_name,
      subject: data.subject,
      source: data.source,
    })

    const adminResult = await sendAdminContactNotification({
      subject: data.subject,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message ?? null,
      source: data.source,
    })

    if (!adminResult.success) {
      console.error('[Action: Contact] Mailjet Notification Error:', adminResult.error)
    }
  } catch (error) {
    console.error('[Action: Contact] Mailjet Notification Error:', error)
  }
}

export async function submitContactForm(prevState: unknown, formData: FormData) {
  // 0. Protection Anti-Bot (Honeypot & Time-Trap < 3000 ms) -> Silent Drop
  const companyFax =
    typeof formData.get('company_fax') === 'string'
      ? (formData.get('company_fax') as string)
      : undefined
  const formLoadedAt =
    typeof formData.get('form_loaded_at') === 'string'
      ? (formData.get('form_loaded_at') as string)
      : undefined

  const botCheck = evaluateBotTrap({
    companyFax,
    formLoadedAt,
  })

  if (botCheck.isBot) {
    console.warn('[Action: Contact][AntiBot] Silent drop déclenché:', {
      reason: botCheck.reason,
      email: formData.get('email'),
    })
    return { success: true as const }
  }

  // 1. Validation stricte Zod (champs + TLD Blacklist + Téléphone ARCEP)
  const validation = contactSiteSchema.safeParse(formDataToContactPayload(formData))

  if (!validation.success) {
    return {
      success: false as const,
      errors: validation.error.flatten().fieldErrors,
    }
  }

  const validatedData = validation.data

  const {
    subject,
    first_name,
    last_name,
    email,
    phone,
    message,
    marketing_consent,
    status,
    source,
    user_id,
    company_id,
    usecase_id,
  } = validatedData

  // 2. Client Supabase & contrôle d'authentification
  let supabase
  try {
    supabase = await createSupabaseServerClient()
  } catch (error) {
    console.error('[Action: Contact] Erreur Supabase:', error)
    return {
      success: false as const,
      error:
        'Une erreur est survenue lors de l\'envoi du formulaire. Veuillez réessayer plus tard.',
    }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (user_id && (!user || user.id !== user_id)) {
    console.error('[Action: Contact] Erreur auth:', authError)
    return {
      success: false as const,
      error:
        'Une erreur est survenue lors de l\'envoi du formulaire. Veuillez réessayer plus tard.',
    }
  }

  // 3. Vérification Cloudflare Turnstile obligatoire pour les soumissions publiques non authentifiées
  const isVerifiedAuthenticatedUser = Boolean(user && user_id && user.id === user_id)

  if (!isVerifiedAuthenticatedUser) {
    const turnstileToken = readOptionalString(formData.get('cf-turnstile-response'))
    let remoteIp: string | undefined
    try {
      const reqHeaders = await headers()
      const forwardedFor = reqHeaders.get('x-forwarded-for')
      remoteIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : undefined
    } catch (error) {
      console.error('[Action: Contact] Lecture headers IP impossible:', error)
    }

    const turnstileCheck = await verifyTurnstileToken(turnstileToken, remoteIp)
    if (!turnstileCheck.success) {
      return {
        success: false as const,
        error:
          'La vérification de sécurité anti-robot a échoué ou a expiré. Veuillez réessayer.',
      }
    }
  }

  // 4. Persistance dans contact_site
  const { error } = await supabase.from('contact_site').insert({
    subject,
    first_name,
    last_name,
    email,
    phone: phone ?? null,
    message: message ?? null,
    marketing_consent,
    status,
    source,
    user_id: user?.id ?? user_id ?? null,
    company_id: company_id ?? null,
    usecase_id: usecase_id ?? null,
  })

  if (error) {
    console.error('[Action: Contact] Erreur Supabase:', error)
    return {
      success: false as const,
      error:
        'Une erreur est survenue lors de l\'envoi du formulaire. Veuillez réessayer plus tard.',
    }
  }

  // 5. Envoi des emails Mailjet (Confirmation + Notification Admin neutralisée)
  await sendContactEmailsSafely({
    email,
    first_name,
    last_name,
    subject,
    source,
    phone,
    message,
  })

  revalidatePath('/admin/contacts')

  return { success: true as const }
}
