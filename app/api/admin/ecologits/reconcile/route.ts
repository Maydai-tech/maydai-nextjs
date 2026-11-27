import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAdminAuth } from '@/lib/admin-auth'
import {
  EcologitsLinkUpdateError,
  ignoreEcologitsModel,
  ignoreEcologitsModels,
  listEcologitsQueue,
  matchEcologitsModel,
  unignoreEcologitsModel,
  unignoreEcologitsModels,
  unlinkEcologitsModel,
} from '@/lib/ecologits/link-actions'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'
import { EcologitsReconcileActionBodySchema } from '@/types/ecologits.zod'

export const dynamic = 'force-dynamic'

const QueueQuerySchema = z.object({
  status: z.enum(['unmatched', 'ignored', 'matched', 'all']).default('all'),
  search: z.string().default(''),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
}).strict()

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const query: Record<string, string> = {}
  for (const key of ['status', 'search', 'page', 'pageSize'] as const) {
    const value = request.nextUrl.searchParams.get(key)
    if (value != null) query[key] = value
  }
  const parsed = QueueQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(' ; ') || 'Paramètres invalides.' },
      { status: 400 },
    )
  }

  try {
    const queue = await listEcologitsQueue(createEcoLogitsServiceClient(), parsed.data)
    return NextResponse.json(queue, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[EcoLogits Reconcile]', error)
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  let json: unknown
  try {
    json = await request.json()
  } catch (error) {
    console.error('[EcoLogits Reconcile]', error)
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }
  const parsed = EcologitsReconcileActionBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(' ; ') || 'Action invalide.' },
      { status: 400 },
    )
  }

  try {
    const supabase = createEcoLogitsServiceClient()
    const body = parsed.data
    if (body.action === 'match') {
      return NextResponse.json(await matchEcologitsModel(supabase, {
        ecologitsModelId: body.ecologits_model_id,
        maydaiModelId: body.maydai_model_id,
        conflictMode: body.conflict_mode,
      }))
    }
    if (body.action === 'ignore') {
      return NextResponse.json(await ignoreEcologitsModel(supabase, body.ecologits_model_id))
    }
    if (body.action === 'ignore_many') {
      return NextResponse.json(await ignoreEcologitsModels(supabase, body.ecologits_model_ids))
    }
    if (body.action === 'unignore') {
      return NextResponse.json(await unignoreEcologitsModel(supabase, body.ecologits_model_id))
    }
    if (body.action === 'unignore_many') {
      return NextResponse.json(await unignoreEcologitsModels(supabase, body.ecologits_model_ids))
    }
    return NextResponse.json(await unlinkEcologitsModel(supabase, body.ecologits_model_id))
  } catch (error) {
    console.error('[EcoLogits Reconcile]', error)
    const status = error instanceof EcologitsLinkUpdateError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status })
  }
}
