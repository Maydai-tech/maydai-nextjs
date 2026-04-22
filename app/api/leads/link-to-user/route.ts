import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth';
import { linkLeadToUser } from '@/lib/leads/link-lead-to-user';
import {
  leadQualifiesForGoogleAdsClickConversion,
  sendGoogleAdsConversion,
} from '@/lib/google-ads/conversions';

/**
 * POST /api/leads/link-to-user
 * Lie un lead à l’utilisateur authentifié (service role, hors RLS client).
 * Body: { leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedSupabaseClient(request);

    let body: { leadId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const leadId =
      typeof body.leadId === 'string' ? body.leadId.trim() : '';

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId est obligatoire' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error('[link-to-user] SUPABASE_SERVICE_ROLE_KEY manquant');
      return NextResponse.json(
        { error: 'Configuration serveur' },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey);
    const { data: lead, error: leadErr } = await (admin as any)
      .from('leads')
      .select('email')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr) {
      console.error('[link-to-user] Lecture lead:', leadErr);
      return NextResponse.json(
        { error: 'Erreur lors de la lecture du lead' },
        { status: 500 }
      );
    }

    if (!lead?.email) {
      return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
    }

    const leadEmail = String(lead.email).trim().toLowerCase();
    const userEmail = (user.email ?? '').trim().toLowerCase();
    if (!userEmail || leadEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Le lead ne correspond pas à cet utilisateur' },
        { status: 403 }
      );
    }

    const result = await linkLeadToUser(leadId, user.id);
    if (!result.ok) {
      console.error('[link-to-user] Échec mise à jour:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const { data: leadAfter } = await (admin as any)
      .from('leads')
      .select('source, click_id')
      .eq('id', leadId)
      .maybeSingle();

    if (
      leadAfter &&
      leadQualifiesForGoogleAdsClickConversion({
        source: leadAfter.source,
        click_id: leadAfter.click_id,
      })
    ) {
      await sendGoogleAdsConversion({
        clickId: String(leadAfter.click_id),
        conversionName: 'Inscription - MaydAI',
        conversionValue: 0,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[link-to-user]', error);
    if (error instanceof Error) {
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('JWT') ||
        error.message.includes('No authorization') ||
        error.message.includes('Invalid token')
      ) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
