import { NextRequest, NextResponse } from 'next/server'
import { confirmDeletionAndStart24hTimer } from '@/lib/services/governancePurgeService'
import { ConfirmDeletionPayloadSchema } from '@/lib/validations/governance-scores'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maydai.io'

function readPayload(request: NextRequest, body: unknown) {
  const query = request.nextUrl.searchParams
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return ConfirmDeletionPayloadSchema.safeParse({
    type: record.type ?? query.get('type'),
    id: record.id ?? query.get('id'),
    token: record.token ?? query.get('token'),
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isBrowserFormPost(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type') ?? ''
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  )
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (isBrowserFormPost(request)) {
    try {
      const form = await request.formData()
      return {
        type: form.get('type'),
        id: form.get('id'),
        token: form.get('token'),
      }
    } catch (error) {
      console.error('[POST /api/governance/confirm-deletion] form', error)
      return null
    }
  }

  try {
    return await request.json()
  } catch (error) {
    console.error('[POST /api/governance/confirm-deletion] body', error)
    return null
  }
}

function confirmationPage(type: string, id: string, token: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Confirmer la suppression — MaydAI</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1.25rem; color: #111827; }
    h1 { font-size: 1.35rem; }
    p { line-height: 1.5; color: #374151; }
    form { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    button, a { display: inline-block; padding: 0.6rem 1rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
    button { background: #b91c1c; color: #fff; border: 0; cursor: pointer; }
    a { background: #f3f4f6; color: #111827; }
  </style>
</head>
<body>
  <h1>Confirmer la suppression</h1>
  <p>Pour lancer le délai de 24&nbsp;h avant purge, confirmez cette action. Rien n’est supprimé tant que vous n’avez pas cliqué sur le bouton.</p>
  <form method="post" action="/api/governance/confirm-deletion">
    <input type="hidden" name="type" value="${escapeHtml(type)}" />
    <input type="hidden" name="id" value="${escapeHtml(id)}" />
    <input type="hidden" name="token" value="${escapeHtml(token)}" />
    <button type="submit">Confirmer la suppression</button>
    <a href="${escapeHtml(APP_URL)}/dashboard/registries">Annuler</a>
  </form>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

/**
 * GET ne fait que présenter un formulaire : un GET (prefetch Safe Links / antivirus)
 * ne doit pas confirmer la purge ni supprimer les fichiers Storage.
 */
export async function GET(request: NextRequest) {
  const parsed = readPayload(request, null)
  if (!parsed.success) {
    return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`)
  }

  return confirmationPage(parsed.data.type, parsed.data.id, parsed.data.token)
}

export async function POST(request: NextRequest) {
  const body = await readBody(request)
  const parsed = readPayload(request, body)
  const asForm = isBrowserFormPost(request)

  if (!parsed.success) {
    if (asForm) {
      return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`, 303)
    }
    return NextResponse.json({ error: 'Jeton de confirmation invalide ou déjà utilisé' }, { status: 400 })
  }

  try {
    const result = await confirmDeletionAndStart24hTimer({
      entityType: parsed.data.type,
      entityId: parsed.data.id,
      rawToken: parsed.data.token,
    })
    if (!result.ok) {
      if (asForm) {
        return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`, 303)
      }
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    if (asForm) {
      return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_started=1`, 303)
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/governance/confirm-deletion]', error)
    if (asForm) {
      return NextResponse.redirect(`${APP_URL}/dashboard/registries?purge_error=invalid_token`, 303)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur DB' },
      { status: 500 }
    )
  }
}
