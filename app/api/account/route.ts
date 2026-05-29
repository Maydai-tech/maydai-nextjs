import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestContext } from '@/lib/secure-logger'
import { buildDeletionPreview, deleteUserAccount } from '@/lib/account-deletion'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    'Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY doivent être définies'
  )
}

/**
 * Authentifie l'appelant via son Bearer token et renvoie son user.
 */
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { user: null, error: 'No authorization header' as const }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { user: null, error: 'Invalid token' as const }
  }

  return { user, error: null }
}

/**
 * GET /api/account — aperçu de ce qui sera supprimé (companies possédées +
 * collaborateurs impactés, companies où l'utilisateur n'est que collaborateur).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!)
    const preview = await buildDeletionPreview(supabaseAdmin, user.id)

    return NextResponse.json(preview)
  } catch (err) {
    const context = createRequestContext(request)
    logger.error('Account deletion preview error', err, context)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/account — suppression définitive (hard delete RGPD) du compte
 * de l'utilisateur authentifié et de toutes ses données associées.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const context = createRequestContext(request)
    // RGPD : ne logger que des identifiants pseudonymes (userId + requestId),
    // pas de PII (email, IP, userAgent).
    logger.info('Deleting user account and all associated data', {
      userId: user.id,
      requestId: context.requestId
    })

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!)
    await deleteUserAccount(supabaseAdmin, user.id)

    logger.info('Successfully deleted user account', {
      userId: user.id,
      requestId: context.requestId
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const context = createRequestContext(request)
    logger.error('Account deletion error', err, context)
    return NextResponse.json({ error: 'Error deleting account' }, { status: 500 })
  }
}
