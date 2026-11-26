import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserByEmail } from '@/lib/invite-user'
import { HAS_PASSWORD_KEY } from '@/lib/password-policy'
import { clientIp, isRateLimited } from '@/lib/rate-limit'

const BodySchema = z.object({ email: z.string().trim().toLowerCase().email() })

/**
 * Écran à afficher après la saisie de l'email (MAY-6) :
 * - `code` : compte existant qui n'a jamais choisi de mot de passe (connexion par code, comme avant) ;
 * - `password` : tous les autres, y compris un email inconnu (on ne dit pas si le compte existe).
 * Route publique par nature (avant connexion), comme /api/auth/check-email. La réponse `code`
 * révèle qu'un ancien compte existe : compromis accepté pour afficher le bon écran, borné par
 * la limite de débit par adresse IP (qui borne aussi les parcours de `listUsers`).
 */
const MAX_REQUESTS_PER_MINUTE = 10

export async function POST(request: NextRequest) {
  if (isRateLimited(`login-method:${clientIp(request.headers)}`, MAX_REQUESTS_PER_MINUTE, 60_000)) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, { status: 429 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const { user, error } = await getUserByEmail(parsed.data.email)
  if (error) {
    console.error('[login-method]', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification de l’email' }, { status: 500 })
  }

  const method = user && user.user_metadata?.[HAS_PASSWORD_KEY] !== true ? 'code' : 'password'
  return NextResponse.json({ method })
}
