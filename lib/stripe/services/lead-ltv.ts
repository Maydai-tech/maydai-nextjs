import { createClient } from '@supabase/supabase-js'
import {
  leadQualifiesForGoogleAdsClickConversion,
  sendGoogleAdsConversion,
} from '@/lib/google-ads/conversions'

export type StripeLeadAttributionInput = {
  /** Libellé pour les logs (ex. type d’événement + id Stripe). */
  context: string
  /** Montant en euros (déjà converti depuis les centimes). */
  amountEuros: number
  userId?: string | null
  email?: string | null
  /**
   * Identifiant unique côté Stripe (`checkout.session.id`, `invoice.id`, …)
   * pour `order_id` Google Ads (dédup en cas de retry webhook).
   */
  stripePaymentId?: string | null
}

/**
 * Incrémente `total_revenue` et porte `funnel_stage` à au moins **4** (converti payant)
 * pour tout lead dont l’email ou `converted_to_user_id` correspond.
 * Client **service role** — ne lève pas d’erreur (webhook Stripe).
 */
export async function applyStripePaymentToLeads(
  input: StripeLeadAttributionInput
): Promise<void> {
  const { context, amountEuros } = input
  const userId = input.userId?.trim() || null
  const email = input.email?.trim().toLowerCase() || null
  const stripePaymentId = input.stripePaymentId?.trim() || null

  const log = (message: string, data?: Record<string, unknown>) => {
    console.log(`[stripe-ltv] ${context} — ${message}`, data ?? {})
  }

  try {
    if (!amountEuros || amountEuros <= 0) {
      log('ignoré : montant invalide', { amountEuros })
      return
    }
    if (!userId && !email) {
      log('ignoré : pas de userId ni email', {})
      return
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.warn('[stripe-ltv] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
      return
    }

    const admin = createClient(url, key) as any

    const leadIds = new Set<string>()

    if (email) {
      const { data: byEmail, error } = await admin
        .from('leads')
        .select('id')
        .eq('email', email)
      if (error) {
        log('erreur SELECT leads par email', { message: error.message })
      } else {
        ;(byEmail as { id: string }[] | null)?.forEach((r) => leadIds.add(r.id))
      }
    }

    if (userId) {
      const { data: byUser, error } = await admin
        .from('leads')
        .select('id')
        .eq('converted_to_user_id', userId)
      if (error) {
        log('erreur SELECT leads par converted_to_user_id', {
          message: error.message,
        })
      } else {
        ;(byUser as { id: string }[] | null)?.forEach((r) => leadIds.add(r.id))
      }
    }

    if (leadIds.size === 0) {
      log('aucun lead trouvé (OK pour Stripe)', { userId, email })
      return
    }

    log('mise à jour LTV', {
      leadCount: leadIds.size,
      leadIds: [...leadIds],
      amountEuros,
    })

    for (const id of leadIds) {
      const { data: row, error: selErr } = await admin
        .from('leads')
        .select('id, total_revenue, funnel_stage, click_id, source')
        .eq('id', id)
        .maybeSingle()

      if (selErr || !row) {
        log('lecture lead échouée', { id, error: selErr?.message })
        continue
      }

      const currentRev = Number(row.total_revenue) || 0
      const newRev = currentRev + amountEuros
      const prevStage = Number(row.funnel_stage) || 0
      const newStage = Math.max(prevStage, 4)

      const { error: upErr } = await admin
        .from('leads')
        .update({
          total_revenue: newRev,
          funnel_stage: newStage,
        })
        .eq('id', id)

      if (upErr) {
        log('UPDATE lead échoué', { id, error: upErr.message })
      } else {
        log('lead mis à jour', {
          id,
          total_revenue_before: currentRev,
          total_revenue_after: newRev,
          funnel_stage_before: prevStage,
          funnel_stage_after: newStage,
          increment_euros: amountEuros,
        })

        if (
          leadQualifiesForGoogleAdsClickConversion({
            source: row.source,
            click_id: row.click_id,
          })
        ) {
          const googleOrderId =
            stripePaymentId != null && stripePaymentId.length > 0
              ? `${stripePaymentId}:lead-${id}`
              : undefined
          await sendGoogleAdsConversion({
            clickId: String(row.click_id),
            conversionName:
              'Action de conversion créée automatiquement pour les leads convertis',
            conversionValue: amountEuros,
            ...(googleOrderId ? { orderId: googleOrderId } : {}),
          })
        }
      }
    }
  } catch (e) {
    console.log(`[stripe-ltv] ${context} — exception (non bloquant)`, e)
  }
}
