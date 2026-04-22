import { GoogleAdsApi, type Customer } from 'google-ads-api'

const LOG_PREFIX = '[google-ads-api]'

type GoogleAdsEnv = {
  developerToken: string
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
  loginCustomerId: string
}

let adsClient: GoogleAdsApi | null = null

const conversionActionResourceByName = new Map<string, string>()

function normalizeTenDigitGoogleAdsId(
  raw: string | undefined,
  envName: string
): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) {
    console.error(`${LOG_PREFIX} ${envName} manquant ou vide`)
    return null
  }
  const digits = trimmed.replace(/-/g, '')
  if (!/^\d{10}$/.test(digits)) {
    console.error(
      `${LOG_PREFIX} ${envName} invalide (attendu : 10 chiffres, avec ou sans tirets)`
    )
    return null
  }
  return digits
}

function readGoogleAdsEnv(): GoogleAdsEnv | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()

  if (!developerToken || !clientId || !clientSecret || !refreshToken) {
    return null
  }

  const customerId = normalizeTenDigitGoogleAdsId(
    process.env.GOOGLE_ADS_CUSTOMER_ID,
    'GOOGLE_ADS_CUSTOMER_ID'
  )
  if (!customerId) return null

  const loginCustomerId = normalizeTenDigitGoogleAdsId(
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
  )
  if (!loginCustomerId) return null

  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    loginCustomerId,
  }
}

function getAdsClient(env: GoogleAdsEnv): GoogleAdsApi {
  if (!adsClient) {
    adsClient = new GoogleAdsApi({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      developer_token: env.developerToken,
    })
  }
  return adsClient
}

function escapeGaqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatConversionDateTime(d: Date): string {
  const iso = d.toISOString()
  const dateTime = iso.slice(0, 19).replace('T', ' ')
  return `${dateTime}+00:00`
}

/**
 * Leads éligibles aux conversions « clic » Google Ads (GCLID dans `click_id`).
 */
export function leadQualifiesForGoogleAdsClickConversion(row: {
  source?: string | null
  click_id?: string | null
}): boolean {
  const source = (row.source ?? '').trim()
  const clickId = (row.click_id ?? '').trim()
  if (!clickId) return false
  return source === 'google_ads_form' || source === 'website_direct'
}

async function resolveConversionActionResourceName(
  customer: Customer,
  conversionName: string
): Promise<string | null> {
  const nameKey = conversionName.trim()
  if (!nameKey) return null

  const cached = conversionActionResourceByName.get(nameKey)
  if (cached) return cached

  const gaql = `
    SELECT conversion_action.resource_name
    FROM conversion_action
    WHERE conversion_action.name = '${escapeGaqlString(nameKey)}'
    LIMIT 1
  `

  const rows = await customer.query(gaql)
  const first = (rows as unknown[])[0] as Record<string, unknown> | undefined
  const ca = first?.conversion_action ?? first?.conversionAction
  const resourceName =
    (ca as { resource_name?: string } | undefined)?.resource_name ??
    (ca as { resourceName?: string } | undefined)?.resourceName ??
    null

  if (!resourceName) {
    return null
  }

  conversionActionResourceByName.set(nameKey, resourceName)
  return resourceName
}

export type SendGoogleAdsConversionInput = {
  clickId: string
  conversionName: string
  conversionValue: number
  currencyCode?: string
  /** Déduplication côté Google Ads (ex. id Stripe + lead). Max ~100 car. */
  orderId?: string
}

/**
 * Envoie une conversion hors ligne (GCLID) vers Google Ads.
 * Ne lève jamais d’exception : retourne `false` et logue en cas d’échec.
 */
const GOOGLE_ADS_ORDER_ID_MAX_LEN = 100

export async function sendGoogleAdsConversion({
  clickId,
  conversionName,
  conversionValue,
  currencyCode = 'EUR',
  orderId,
}: SendGoogleAdsConversionInput): Promise<boolean> {
  try {
    const env = readGoogleAdsEnv()
    if (!env) {
      console.warn(`${LOG_PREFIX} variables d’environnement incomplètes, envoi ignoré`)
      return false
    }

    const gclid = clickId.trim()
    if (!gclid) {
      console.warn(`${LOG_PREFIX} clickId vide, envoi ignoré`)
      return false
    }

    const client = getAdsClient(env)
    const customer = client.Customer({
      customer_id: env.customerId,
      refresh_token: env.refreshToken,
      login_customer_id: env.loginCustomerId,
    })

    const conversionAction = await resolveConversionActionResourceName(
      customer,
      conversionName
    )
    if (!conversionAction) {
      console.error(
        `${LOG_PREFIX} aucune conversion_action trouvée pour le nom :`,
        conversionName
      )
      return false
    }

    const orderIdTrimmed = orderId?.trim()
    const order_id =
      orderIdTrimmed && orderIdTrimmed.length > 0
        ? orderIdTrimmed.slice(0, GOOGLE_ADS_ORDER_ID_MAX_LEN)
        : undefined

    const clickPayload: Record<string, unknown> = {
      gclid,
      conversion_action: conversionAction,
      conversion_date_time: formatConversionDateTime(new Date()),
      conversion_value: conversionValue,
      currency_code: currencyCode,
    }
    if (order_id) {
      clickPayload.order_id = order_id
    }

    const response = await customer.conversionUploads.uploadClickConversions(
      {
        customer_id: env.customerId,
        partial_failure: true,
        validate_only: false,
        conversions: [clickPayload],
      } as never
    )

    const partial =
      (response as { partial_failure_error?: unknown }).partial_failure_error ??
      (response as { partialFailureError?: unknown }).partialFailureError

    if (partial) {
      console.error(`${LOG_PREFIX} partial_failure`, partial)
      return false
    }

    return true
  } catch (e) {
    console.error(`${LOG_PREFIX}`, e)
    return false
  }
}
