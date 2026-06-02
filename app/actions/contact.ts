'use server'

import { revalidatePath } from 'next/cache'
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
      '[API_CONTACT_SUBMIT] Erreur Mailjet:',
      'MAILJET_API_KEY ou MAILJET_API_SECRET manquant',
    )
    return
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  try {
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
      console.error('[API_CONTACT_SUBMIT] Erreur Mailjet:', {
        status: response.status,
        body,
      })
    }
  } catch (error) {
    console.error('[API_CONTACT_SUBMIT] Erreur Mailjet:', error)
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

  const data = validation.data

  let supabase
  try {
    supabase = await createSupabaseServerClient()
  } catch (error) {
    console.error('[API_CONTACT_SUBMIT] Erreur Supabase:', error)
    return {
      success: false as const,
      error:
        'Une erreur est survenue lors de l\'envoi du formulaire. Veuillez réessayer plus tard.',
    }
  }

  const { error } = await supabase.from('contact_site').insert({
    subject: data.subject,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone ?? null,
    message: data.message ?? null,
    marketing_consent: data.marketing_consent,
  })

  if (error) {
    console.error('[API_CONTACT_SUBMIT] Erreur Supabase:', error)
    return {
      success: false as const,
      error:
        'Une erreur est survenue lors de l\'envoi du formulaire. Veuillez réessayer plus tard.',
    }
  }

  await sendContactConfirmationEmail({
    email: data.email,
    first_name: data.first_name,
    subject: data.subject,
  })

  revalidatePath('/admin/contacts')

  return { success: true as const }
}
