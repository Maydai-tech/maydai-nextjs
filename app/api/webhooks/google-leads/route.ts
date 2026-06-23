import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLeadInviteEmail } from '@/lib/email/mailjet'
import {
  extractGoogleLeadFields,
  GOOGLE_LEAD_FORM_COLUMN_ID_EMAIL,
} from '@/lib/google-ads/utils'
import { LeadInsertSchema } from '@/lib/validations/leads'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant(e)'
    )
  }
  return createClient(url, key)
}

/** Valeur texte optionnelle à la racine du JSON (complète `user_column_data` si absente). */
function trimmedRootString(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object') return null
  const v = (body as Record<string, unknown>)[key]
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

/** PostgREST peut renvoyer un objet minimal ; PostgrestError étend Error (message sur l’instance). */
function formatDbInsertError(error: unknown): {
  message: string
  code?: string
  hint?: string
  details?: string
} {
  if (error instanceof Error) {
    const e = error as Error & { code?: string; hint?: string; details?: string }
    return {
      message: e.message || '(message vide)',
      code: e.code,
      hint: e.hint,
      details: e.details,
    }
  }
  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>
    const str = (v: unknown) =>
      typeof v === 'string' ? v : v != null ? String(v) : undefined
    const message = str(o.message)
    return {
      message:
        message && message.length > 0 ? message : JSON.stringify(error),
      code: str(o.code),
      hint: str(o.hint),
      details: str(o.details),
    }
  }
  return { message: String(error) }
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_WEBHOOK_SECRET) {
    console.error('[google-leads] GOOGLE_WEBHOOK_SECRET non configuré')
    return NextResponse.json(
      { error: 'Configuration serveur incomplète' },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  if (payload.google_key !== process.env.GOOGLE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  console.log('[DEBUG] Payload Google Ads brut entrant :', JSON.stringify(body, null, 2))

  const extractedLead = extractGoogleLeadFields(body, request.nextUrl.searchParams)

  const first_name =
    extractedLead.first_name ?? trimmedRootString(body, 'first_name')
  const last_name =
    extractedLead.last_name ?? trimmedRootString(body, 'last_name')
  const phone = extractedLead.phone ?? trimmedRootString(body, 'phone')

  if (!extractedLead.email) {
    return NextResponse.json(
      {
        error: 'Champ obligatoire manquant',
        message: `Aucune valeur pour column_id "${GOOGLE_LEAD_FORM_COLUMN_ID_EMAIL}" dans user_column_data.`,
      },
      { status: 400 }
    )
  }

  let supabase
  try {
    supabase = getServiceSupabase()
  } catch (e) {
    console.error('[google-leads]', e)
    return NextResponse.json(
      { error: 'Configuration Supabase invalide' },
      { status: 500 }
    )
  }

  const gclidForClickId = extractedLead.gclid?.trim() || null
  if (!gclidForClickId) {
    console.warn(
      '[google-leads] Aucun gclid dans le payload Google — click_id non renseigné pour ce lead'
    )
  }

  const insertRow = {
    email: extractedLead.email.trim().toLowerCase(),
    first_name,
    last_name,
    phone,
    company_name: extractedLead.company_name,
    gclid: gclidForClickId,
    click_id: gclidForClickId,
    campaign_name: extractedLead.campaign_name,
    ad_group_name: extractedLead.ad_group_name,
    source: 'google_ads_form',
    /** Aligné sur les autres inserts (`website_direct`) : colonnes souvent NOT NULL en base. */
    funnel_stage: 0,
    total_revenue: 0,
  }

  const { funnel_stage, total_revenue, ...leadInsertPayload } = insertRow

  const leadValidation = LeadInsertSchema.safeParse(leadInsertPayload)
  if (!leadValidation.success) {
    console.error('[Leads API] Validation Error', leadValidation.error)
    return NextResponse.json({ error: 'Payload lead invalide' }, { status: 400 })
  }

  // La table `leads` peut être absente des types DB générés jusqu'au prochain `supabase gen types`.
  const { data: inserted, error } = await (supabase as any)
    .from('leads')
    .insert({
      ...leadValidation.data,
      funnel_stage,
      total_revenue,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      console.info('[google-leads] Lead déjà existant (email unique), ignoré:', {
        email: extractedLead.email,
      })
      return NextResponse.json(
        {
          success: true,
          message: 'Lead ignoré car déjà existant',
        },
        { status: 200 }
      )
    }

    const err = formatDbInsertError(error)
    console.error('[google-leads] Erreur insertion leads:', err, error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }

  const row = inserted as { id: string; first_name: string | null }
  const leadId = row.id
  const firstNameForEmail = (first_name ?? '').trim()

  if (payload.is_test === true) {
    console.log(
      '[Google Webhook] Mode test Google détecté : envoi Mailjet ignoré.'
    )
  } else {
    const mailResult = await sendLeadInviteEmail({
      leadEmail: insertRow.email,
      firstName: firstNameForEmail,
      leadId,
    })

    if (!mailResult.success) {
      console.error('[google-leads] Mailjet non envoyé (lead créé):', leadId)
    }
  }

  return NextResponse.json(inserted, { status: 200 })
}
