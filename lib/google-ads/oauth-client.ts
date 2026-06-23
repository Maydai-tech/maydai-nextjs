import { OAuth2Client } from 'google-auth-library'

const GOOGLE_ADS_API_VERSION = 'v23'
const ACCESS_TOKEN_CACHE_TTL_MS = 50 * 60 * 1000

export type GoogleAdsOAuthEnv = {
  developerToken: string
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
  loginCustomerId: string
}

type CachedAccessToken = {
  token: string
  expiresAt: number
}

let cachedAccessToken: CachedAccessToken | null = null

/**
 * Empêche google-gax / google-auth-library de sonder 169.254.169.254
 * (comportement ADC) sur Vercel et autres environnements non-GCP.
 */
export function disableGoogleMetadataServerProbe(): void {
  if (!process.env.METADATA_SERVER_DETECTION) {
    process.env.METADATA_SERVER_DETECTION = 'none'
  }
}

disableGoogleMetadataServerProbe()

function buildGoogleAdsHeaders(
  env: GoogleAdsOAuthEnv,
  accessToken: string
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': env.developerToken,
    'login-customer-id': env.loginCustomerId,
  }
}

/**
 * OAuth2 explicite (refresh_token) — aucun fallback ADC.
 */
export async function getGoogleAdsAccessToken(
  env: GoogleAdsOAuthEnv
): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token
  }

  const oauth2Client = new OAuth2Client(env.clientId, env.clientSecret)
  oauth2Client.setCredentials({ refresh_token: env.refreshToken })

  const { token } = await oauth2Client.getAccessToken()
  if (!token) {
    throw new Error('Impossible de récupérer un access token Google Ads')
  }

  cachedAccessToken = {
    token,
    expiresAt: now + ACCESS_TOKEN_CACHE_TTL_MS,
  }

  return token
}

export type RestClickConversion = {
  gclid?: string
  gbraid?: string
  wbraid?: string
  conversionAction: string
  conversionDateTime: string
  conversionValue: number
  currencyCode: string
  orderId?: string
  userIdentifiers?: Array<{ hashedEmail: string }>
}

export type UploadClickConversionsRestInput = {
  partialFailure?: boolean
  validateOnly?: boolean
  conversions: RestClickConversion[]
}

export type UploadClickConversionsRestResponse = {
  partialFailureError?: unknown
  results?: unknown[]
}

/**
 * Upload OCI via REST — évite le client gRPC google-ads-node qui déclenche ADC.
 * @see https://developers.google.com/google-ads/api/rest/reference/rest/v23/customers/uploadClickConversions
 */
export async function uploadClickConversionsViaRest(
  env: GoogleAdsOAuthEnv,
  request: UploadClickConversionsRestInput
): Promise<UploadClickConversionsRestResponse> {
  const accessToken = await getGoogleAdsAccessToken(env)
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${env.customerId}:uploadClickConversions`

  const response = await fetch(url, {
    method: 'POST',
    headers: buildGoogleAdsHeaders(env, accessToken),
    body: JSON.stringify({
      partialFailure: request.partialFailure ?? true,
      validateOnly: request.validateOnly ?? false,
      conversions: request.conversions,
    }),
  })

  const body = (await response.json().catch(() => null)) as
    | UploadClickConversionsRestResponse
    | { error?: { message?: string; details?: unknown[] } }
    | null

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error?.message
        ? body.error.message
        : `HTTP ${response.status}`
    throw new Error(`uploadClickConversions REST: ${message}`)
  }

  return (body ?? {}) as UploadClickConversionsRestResponse
}
