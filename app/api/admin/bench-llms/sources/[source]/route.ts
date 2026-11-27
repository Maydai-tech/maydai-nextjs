import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { loadBenchSourceDetail } from '@/lib/bench-llm/source-reconcile-service'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'
import { BenchSourceSlugSchema } from '@/types/bench-sources.zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SourceQuerySchema = z.object({
  includeSheetMap: z.enum(['true', 'false']).optional(),
}).strict()

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ source: string }> },
) {
  const auth = await verifyAdminAuth(request)
  if (auth.error) return auth.error

  const { source: rawSource } = await context.params
  const source = BenchSourceSlugSchema.safeParse(rawSource)
  if (!source.success) {
    return NextResponse.json({ error: 'Source inconnue.' }, { status: 400 })
  }

  const includeSheetMap = request.nextUrl.searchParams.get('includeSheetMap')
  const query = SourceQuerySchema.safeParse(includeSheetMap == null ? {} : { includeSheetMap })
  if (!query.success) {
    return NextResponse.json(
      { error: query.error.issues.map((issue) => issue.message).join(' ; ') || 'Paramètres invalides.' },
      { status: 400 },
    )
  }

  try {
    const detail = await loadBenchSourceDetail(createEcoLogitsServiceClient(), source.data, {
      includeSheetMap: query.data.includeSheetMap === 'true',
    })
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Bench Source]', error)
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
