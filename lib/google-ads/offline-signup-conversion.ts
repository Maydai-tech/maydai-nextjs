import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { normalizeGoogleAdsClickId } from '@/lib/google-ads/click-id'
import {
  sendGoogleAdsConversion,
  type SendGoogleAdsConversionInput,
} from '@/lib/google-ads/conversions'

export { normalizeGoogleAdsClickId } from '@/lib/google-ads/click-id'

const LOG_PREFIX = '[google-ads-offline-signup]'
const DEDUP_TABLE = 'google_ads_offline_import_dedup'

/** Action d’import hors ligne pour les inscriptions (ne pas confondre avec le tag web). */
export const GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME =
  'hors connexion (importation)' as const

export type OfflineSignupConversionResult =
  | 'sent'
  | 'skipped_duplicate'
  | 'failed'

function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.warn(
      `${LOG_PREFIX} NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — déduplication désactivée`
    )
    return null
  }
  return createClient(url, key)
}

type ClaimResult = 'claimed' | 'duplicate' | 'error'

async function claimOfflineSignupClickId(
  supabase: SupabaseClient,
  clickId: string
): Promise<ClaimResult> {
  const { error } = await supabase.from(DEDUP_TABLE).insert({
    click_id: clickId,
    conversion_action_name: GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME,
  })

  if (!error) {
    return 'claimed'
  }

  if (error.code === '23505') {
    return 'duplicate'
  }

  console.error(`${LOG_PREFIX} échec réservation dédup`, error)
  return 'error'
}

async function releaseOfflineSignupClickId(
  supabase: SupabaseClient,
  clickId: string
): Promise<void> {
  const { error } = await supabase
    .from(DEDUP_TABLE)
    .delete()
    .eq('click_id', clickId)
    .eq('conversion_action_name', GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME)

  if (error) {
    console.error(`${LOG_PREFIX} échec libération dédup après échec API`, error)
  }
}

export type SendGoogleAdsOfflineSignupConversionInput = Omit<
  SendGoogleAdsConversionInput,
  'conversionName' | 'clickId'
> & {
  clickId: string
}

/**
 * Import hors ligne inscription : au plus un envoi API par gclid/click_id
 * pour l’action « hors connexion (importation) ».
 */
export async function sendGoogleAdsOfflineSignupConversion(
  input: SendGoogleAdsOfflineSignupConversionInput
): Promise<OfflineSignupConversionResult> {
  const clickId = normalizeGoogleAdsClickId(input.clickId)
  if (!clickId) {
    console.warn(`${LOG_PREFIX} clickId vide, envoi ignoré`)
    return 'failed'
  }

  const supabase = getServiceSupabase()
  if (supabase) {
    const claim = await claimOfflineSignupClickId(supabase, clickId)
    if (claim === 'duplicate') {
      console.info(
        `${LOG_PREFIX} import déjà envoyé ou en cours pour ce click_id, ignoré:`,
        clickId
      )
      return 'skipped_duplicate'
    }
    if (claim === 'error') {
      return 'failed'
    }
  }

  const sent = await sendGoogleAdsConversion({
    clickId,
    conversionName: GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME,
    conversionValue: input.conversionValue,
    currencyCode: input.currencyCode,
    orderId: input.orderId,
    email: input.email,
  })

  if (!sent) {
    if (supabase) {
      await releaseOfflineSignupClickId(supabase, clickId)
    }
    return 'failed'
  }

  return 'sent'
}
