/**
 * Preuve QA — bug de routage OCI wbraid/gbraid → champ API `gclid`.
 *
 * Reproduit la chaîne actuelle sans appel réseau Google Ads :
 * 1. capture URL (lib/tracking/capture-params) — wbraid en query string
 * 2. normalisation click id (lib/google-ads/click-id)
 * 3. construction payload uploadClickConversions (lib/google-ads/conversions.ts L205–251)
 *
 * Usage :
 *   npx tsx scripts/debug/test-google-payload.ts
 *   npx tsx scripts/debug/test-google-payload.ts --id gbraid_67890FGHIJ
 */

import { normalizeGoogleAdsClickId } from '../../lib/google-ads/click-id'
import { parseAttributionFromSearchParams } from '../../lib/tracking/capture-params'

/** Miroir exact de lib/google-ads/conversions.ts (sendGoogleAdsConversion, sans env ni réseau). */
function formatConversionDateTime(d: Date): string {
  const iso = d.toISOString()
  const dateTime = iso.slice(0, 19).replace('T', ' ')
  return `${dateTime}+00:00`
}

type BuildPayloadInput = {
  clickId: string
  conversionAction: string
  conversionValue: number
  currencyCode?: string
  orderId?: string
}

/**
 * Copie la logique de construction de clickPayload telle qu’en production :
 * le paramètre `clickId` est trimé puis assigné à la clé API `gclid` — sans branche wbraid/gbraid.
 */
function buildUploadClickConversionsPayload(
  input: BuildPayloadInput
): Record<string, unknown> {
  const gclid = input.clickId.trim()
  if (!gclid) {
    throw new Error('clickId vide après trim')
  }

  const orderIdTrimmed = input.orderId?.trim()
  const order_id =
    orderIdTrimmed && orderIdTrimmed.length > 0
      ? orderIdTrimmed.slice(0, 100)
      : undefined

  const clickPayload: Record<string, unknown> = {
    gclid,
    conversion_action: input.conversionAction,
    conversion_date_time: formatConversionDateTime(new Date()),
    conversion_value: input.conversionValue,
    currency_code: input.currencyCode ?? 'EUR',
  }

  if (order_id) {
    clickPayload.order_id = order_id
  }

  // Appel réseau intentionnellement absent :
  // await customer.conversionUploads.uploadClickConversions({ conversions: [clickPayload] })

  return clickPayload
}

function parseCliId(): string {
  const idx = process.argv.indexOf('--id')
  if (idx !== -1 && typeof process.argv[idx + 1] === 'string') {
    return process.argv[idx + 1]
  }
  return 'wbraid_12345ABCDE'
}

function main(): void {
  const iosClickId = parseCliId()
  const conversionAction =
    'customers/0000000000/conversionActions/0000000000' // placeholder — non envoyé

  console.log('='.repeat(72))
  console.log('QA — Preuve routage OCI (sans appel réseau Google Ads)')
  console.log('='.repeat(72))
  console.log()

  // Étape A — ce que capture le front si l’utilisateur arrive avec ?wbraid=...
  const attributionFromUrl = parseAttributionFromSearchParams(
    `wbraid=${encodeURIComponent(iosClickId)}`
  )
  console.log('[A] Attribution capturée depuis URL ?wbraid=...')
  console.log(JSON.stringify(attributionFromUrl, null, 2))
  console.log()

  // Étape B — ce que reçoit sendGoogleAdsOfflineSignupConversion (clickId = click_id ou gclid profil)
  const clickIdPassedToApi =
    normalizeGoogleAdsClickId(attributionFromUrl.click_id ?? iosClickId) ?? iosClickId

  console.log('[B] clickId passé à sendGoogleAdsOfflineSignupConversion')
  console.log(`    valeur : "${clickIdPassedToApi}"`)
  console.log(`    type attendu par Google pour iOS : wbraid (champ API dédié)`)
  console.log()

  // Étape C — objet JSON exact construit pour uploadClickConversions
  const apiPayload = buildUploadClickConversionsPayload({
    clickId: clickIdPassedToApi,
    conversionAction,
    conversionValue: 0,
    currencyCode: 'EUR',
  })

  console.log('[C] Objet conversion tel qu’injecté dans uploadClickConversions.conversions[0]')
  console.log(JSON.stringify(apiPayload, null, 2))
  console.log()

  const wronglyRouted =
    typeof apiPayload.gclid === 'string' &&
    (apiPayload.gclid.startsWith('wbraid_') || apiPayload.gclid.startsWith('gbraid_'))

  if (wronglyRouted) {
    console.log('🔴 FAILLE CONFIRMÉE')
    console.log(
      `   L’identifiant iOS "${iosClickId}" est injecté dans la clé API "gclid".`
    )
    console.log('   Aucune clé "wbraid" ni "gbraid" n’existe dans le payload.')
  } else {
    console.log('ℹ️  Identifiant testé ne ressemble pas à wbraid_/gbraid_ — vérifier manuellement.')
  }

  console.log()
  console.log('Payload complet qui serait passé à Google (mock) :')
  console.log(
    JSON.stringify(
      {
        customer_id: '0000000000',
        partial_failure: true,
        validate_only: true,
        conversions: [apiPayload],
      },
      null,
      2
    )
  )
}

main()
