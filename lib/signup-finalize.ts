import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sendGoogleAdsSignupConversionWithUserData, sendSignUpEvent } from '@/lib/gtm'
import { hashEmailForGoogleAds } from '@/lib/utils/crypto'
import type { CompleteSignUpRequestBody } from '@/lib/types/complete-signup-payload'
import {
  readStoredAttribution,
  hasMeaningfulAttribution,
  clearStoredAttribution,
  type StoredAttribution,
} from '@/lib/tracking/capture-params'

/** Clé `user_metadata` : données d'inscription en attente de confirmation email. */
export const PENDING_SIGNUP_KEY = 'pending_signup'

/**
 * Stocké dans `user_metadata` au `signUp`, puis rejoué par la page de confirmation
 * (ou à la première connexion si le lien a été ouvert sur un autre appareil).
 */
export type PendingSignup = {
  profile: CompleteSignUpRequestBody
  leadId: string | null
  attribution: StoredAttribution | null
}

type PartnerDefaults = { utm_source: string; utm_medium: string; utm_campaign?: string }

/** Attribution effective : stockage navigateur, complété par les UTM par défaut d'une landing partenaire. */
export function computeEffectiveAttribution(partnerDefaults?: PartnerDefaults): StoredAttribution | null {
  const storedAttr = readStoredAttribution()

  const fillEmptyUtm = (current: string | null, fallback: string | undefined): string | null => {
    if (current?.trim()) return current
    if (!partnerDefaults) return current
    const next = fallback?.trim()
    return next || current
  }

  if (storedAttr && hasMeaningfulAttribution(storedAttr)) {
    return {
      click_id: storedAttr.click_id,
      gclid: storedAttr.gclid,
      utm_source: fillEmptyUtm(storedAttr.utm_source, partnerDefaults?.utm_source),
      utm_medium: fillEmptyUtm(storedAttr.utm_medium, partnerDefaults?.utm_medium),
      utm_campaign: fillEmptyUtm(storedAttr.utm_campaign, partnerDefaults?.utm_campaign),
      captured_at: storedAttr.captured_at,
    }
  }
  if (partnerDefaults) {
    return {
      click_id: storedAttr?.click_id ?? null,
      gclid: storedAttr?.gclid ?? null,
      utm_source: partnerDefaults.utm_source,
      utm_medium: partnerDefaults.utm_medium,
      utm_campaign: partnerDefaults.utm_campaign ?? null,
      captured_at: storedAttr?.captured_at ?? new Date().toISOString(),
    }
  }
  return storedAttr
}

/** Champs acquisition attendus par complete-signup. */
export function acquisitionFields(attribution: StoredAttribution | null) {
  const acquisition: Pick<CompleteSignUpRequestBody, 'gclid' | 'utm_source' | 'utm_medium' | 'utm_campaign'> = {}
  if (attribution && hasMeaningfulAttribution(attribution)) {
    if (attribution.gclid?.trim()) acquisition.gclid = attribution.gclid.trim()
    if (attribution.utm_source?.trim()) acquisition.utm_source = attribution.utm_source.trim()
    if (attribution.utm_medium?.trim()) acquisition.utm_medium = attribution.utm_medium.trim()
    if (attribution.utm_campaign?.trim()) acquisition.utm_campaign = attribution.utm_campaign.trim()
  }
  return acquisition
}

export function getPendingSignup(session: Session | null): PendingSignup | null {
  const pending = session?.user?.user_metadata?.[PENDING_SIGNUP_KEY]
  return pending && typeof pending === 'object' && pending.profile ? (pending as PendingSignup) : null
}

/**
 * Crée le profil (complete-signup), lie le lead, envoie les événements GTM puis efface
 * l'inscription en attente. Retourne `false` s'il n'y avait rien à finaliser.
 * Lève une erreur si complete-signup échoue (les données restent en attente pour réessayer).
 */
export async function finalizePendingSignup(session: Session): Promise<boolean> {
  const pending = getPendingSignup(session)
  if (!pending) return false

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }

  const response = await fetch('/api/auth/complete-signup', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(pending.profile),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erreur lors de la création du profil')
  }

  const { leadId, attribution } = pending
  if (leadId) {
    try {
      const linkRes = await fetch('/api/leads/link-to-user', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ leadId }),
      })
      if (!linkRes.ok) {
        console.error('[signup] Liaison lead ignorée (non bloquant):', linkRes.status, await linkRes.text().catch(() => ''))
      }
    } catch (linkErr) {
      console.error('[signup] Liaison lead ignorée (non bloquant):', linkErr)
    }
  } else if (attribution && hasMeaningfulAttribution(attribution)) {
    try {
      const wdRes = await fetch('/api/leads/website-direct', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ attribution }),
      })
      if (wdRes.ok) {
        clearStoredAttribution()
      } else {
        console.error('[signup] Lead website_direct ignoré (non bloquant):', wdRes.status, await wdRes.text().catch(() => ''))
      }
    } catch (wdErr) {
      console.error('[signup] Lead website_direct ignoré (non bloquant):', wdErr)
    }
  }

  const { error: clearError } = await supabase.auth.updateUser({ data: { [PENDING_SIGNUP_KEY]: null } })
  if (clearError) console.error('[signup] Nettoyage pending_signup (non bloquant):', clearError)

  try {
    const hashedEmail = await hashEmailForGoogleAds(session.user?.email || '')
    await Promise.all([
      sendSignUpEvent('formulaire_landing', { userId: session.user?.id }),
      sendGoogleAdsSignupConversionWithUserData(hashedEmail),
    ])
  } catch (gtmErr) {
    console.error('[gtm] Signup event tracking failed:', gtmErr)
  }
  // Laisse partir le payload GTM avant la navigation Next.js.
  await new Promise((resolve) => setTimeout(resolve, 500))
  return true
}
