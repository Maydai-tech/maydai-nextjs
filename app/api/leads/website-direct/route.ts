import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import {
  hasMeaningfulAttribution,
  type StoredAttribution,
} from '@/lib/tracking/capture-params'
import {
  leadQualifiesForGoogleAdsClickConversion,
  sendGoogleAdsConversion,
} from '@/lib/google-ads/conversions'

type Body = {
  attribution?: Partial<StoredAttribution> | null
}

/**
 * Crée un lead `website_direct` lié à l’utilisateur authentifié (service role).
 * Appelé après inscription si pas de `lead_id` mais attribution capturée.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient(request)

    const email = (user.email ?? '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Email utilisateur manquant' }, { status: 400 })
    }

    let body: Body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const attribution = body.attribution ?? null
    if (!hasMeaningfulAttribution(attribution)) {
      return NextResponse.json(
        { error: 'Aucune attribution fournie' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('id', user.id)
      .maybeSingle()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.error('[website-direct] SUPABASE_SERVICE_ROLE_KEY manquant')
      return NextResponse.json({ error: 'Configuration' }, { status: 500 })
    }

    const admin = createClient(url, key)
    const now = new Date().toISOString()

    const row = {
      email,
      first_name: (profile?.first_name as string | null)?.trim() || null,
      last_name: (profile?.last_name as string | null)?.trim() || null,
      company_name: (profile?.company_name as string | null)?.trim() || null,
      source: 'website_direct',
      click_id: attribution!.click_id?.trim() || null,
      utm_source: attribution!.utm_source?.trim() || null,
      utm_medium: attribution!.utm_medium?.trim() || null,
      utm_campaign: attribution!.utm_campaign?.trim() || null,
      converted_to_user_id: user.id,
      funnel_stage: 1,
      converted_at: now,
      total_revenue: 0,
    }

    const { data: inserted, error } = await (admin as any)
      .from('leads')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { ok: true, duplicate: true },
          { status: 200 }
        )
      }
      console.error('[website-direct] Insert:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (
      leadQualifiesForGoogleAdsClickConversion({
        source: row.source,
        click_id: row.click_id,
      })
    ) {
      await sendGoogleAdsConversion({
        clickId: row.click_id as string,
        conversionName: 'Inscription - MaydAI',
        conversionValue: 0,
      })
    }

    return NextResponse.json(
      { ok: true, id: inserted?.id as string | undefined },
      { status: 201 }
    )
  } catch (e) {
    console.error('[website-direct]', e)
    if (e instanceof Error) {
      if (
        e.message.includes('No authorization') ||
        e.message.includes('Invalid token')
      ) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
