import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { generateChatReport } from '@/lib/mistral/generate-chat-report'
import { loadEvaluationContext, parseUsecaseId } from '@/lib/mistral/load-evaluation-context'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  let supabase
  let user
  try {
    ;({ supabase, user } = await getAuthenticatedSupabaseClient(request))
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const usecaseId = parseUsecaseId(
    body && typeof body === 'object' ? (body as { usecase_id?: unknown }).usecase_id : undefined
  )
  if (!usecaseId) {
    return NextResponse.json({ error: 'usecase_id is required' }, { status: 400 })
  }

  const access = await loadEvaluationContext(supabase, user, usecaseId)
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error, code: access.code },
      { status: access.status }
    )
  }

  const result = await generateChatReport({ supabase, user, usecaseId })
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.details ? { details: result.details } : {}),
      },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    usecase_id: result.usecase_id,
    usecase_name: result.usecase_name,
    processing_time_ms: result.processing_time_ms,
    next_steps_status: result.next_steps_status,
    next_steps_saved: result.next_steps_saved,
  })
}
