import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLeadInviteEmail } from '@/lib/email/mailjet'
import {
  extractGoogleLeadFields,
  GOOGLE_LEAD_FORM_COLUMN_ID_EMAIL,
} from '@/lib/google-ads/utils'

function verifyGoogleWebhookBearer(request: NextRequest): boolean {
  const secret = process.env.GOOGLE_WEBHOOK_SECRET
  if (!secret) {
    return false
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`

  try {
    const a = Buffer.from(authHeader, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

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

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_WEBHOOK_SECRET) {
    console.error('[google-leads] GOOGLE_WEBHOOK_SECRET non configuré')
    return NextResponse.json(
      { error: 'Configuration serveur incomplète' },
      { status: 500 }
    )
  }

  if (!verifyGoogleWebhookBearer(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = extractGoogleLeadFields(body, request.nextUrl.searchParams)

  if (!parsed.email) {
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

  const insertRow = {
    email: parsed.email,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    phone: parsed.phone,
    company_name: parsed.company_name,
    gclid: parsed.gclid,
    click_id: parsed.gclid,
    campaign_name: parsed.campaign_name,
    ad_group_name: parsed.ad_group_name,
    source: 'google_ads_form',
  }

  // La table `leads` peut être absente des types DB générés jusqu'au prochain `supabase gen types`.
  const { data: inserted, error } = await (supabase as any)
    .from('leads')
    .insert(insertRow)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      console.info('[google-leads] Lead déjà existant (email unique), ignoré:', {
        email: parsed.email,
      })
      return NextResponse.json(
        {
          error: 'duplicate_email',
          message: 'Un lead avec cet e-mail existe déjà.',
        },
        { status: 409 }
      )
    }

    console.error('[google-leads] Erreur insertion leads:', error)
    return NextResponse.json(
      { error: 'Erreur base de données', details: error },
      { status: 500 }
    )
  }

  const row = inserted as { id: string; first_name: string | null }
  const leadId = row.id
  const firstNameForEmail = (parsed.first_name ?? '').trim()

  const mailResult = await sendLeadInviteEmail({
    leadEmail: parsed.email.trim(),
    firstName: firstNameForEmail,
    leadId,
  })

  if (!mailResult.success) {
    console.error('[google-leads] Mailjet non envoyé (lead créé):', leadId)
  }

  return NextResponse.json(inserted, { status: 201 })
}
