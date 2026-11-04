const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileVerifyResponse = {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<{ success: boolean; errorCodes?: string[] }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error('[Security: Turnstile] TURNSTILE_SECRET_KEY manquant dans l\'environnement')
    return { success: false, errorCodes: ['missing-input-secret'] }
  }

  if (!token || token.trim().length === 0) {
    return { success: false, errorCodes: ['missing-input-response'] }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token.trim())
    if (remoteIp) {
      formData.append('remoteip', remoteIp)
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(
        `[Security: Turnstile] Erreur HTTP Cloudflare (${response.status})`,
      )
      return { success: false, errorCodes: [`http-${response.status}`] }
    }

    const result = (await response.json()) as TurnstileVerifyResponse

    if (!result.success) {
      console.warn(
        '[Security: Turnstile] Jeton rejeté par Cloudflare:',
        result['error-codes'],
      )
    }

    return {
      success: Boolean(result.success),
      errorCodes: result['error-codes'],
    }
  } catch (error) {
    console.error('[Security: Turnstile] Exception lors de la vérification:', error)
    return { success: false, errorCodes: ['internal-error'] }
  }
}
