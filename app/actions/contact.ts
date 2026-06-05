'use server'

import { revalidatePath } from 'next/cache'
import { sendAdminContactNotification } from '@/lib/email/mailjet'
import { contactSiteSchema } from '@/lib/validations/contact'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send'
const CONTACT_MAILJET_TEMPLATE_ID = 8074397
const MAILJET_FROM_EMAIL = 'tech@maydai.io'
const MAILJET_FROM_NAME = 'MaydAI'

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
            Name: MAILJET_FROM_NAME,
          },
          To: [
            {
              Email: data.email,
              Name: data.first_name,
            },
          ],
          TemplateID: CONTACT_MAILJET_TEMPLATE_ID,
          TemplateLanguage: true,
          Variables: {
            first_name: data.first_name,
            subject: data.subject,
          },
        },
      ],
    }),
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
  phone?: string
  message?: string
}): Promise<void> {
  try {
    await sendContactConfirmationEmail({
      email: data.email,
      first_name: data.first_name,
      subject: data.subject,
    })

    const adminResult = await sendAdminContactNotification({
      subject: data.subject,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message ?? null,
    })

    if (!adminResult.success) {
      console.error('[Action: Contact] Mailjet Notification Error:', adminResult.error)
    }
  } catch (error) {
    console.error('[Action: Contact] Mailjet Notification Error:', error)
  }
}

export async function submitContactForm(prevState: unknown, formData: FormData) {
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

  await sendContactEmailsSafely({
    email,
    first_name,
    last_name,
    subject,
    phone,
    message,
  })

  revalidatePath('/admin/contacts')

  return { success: true as const }
}
