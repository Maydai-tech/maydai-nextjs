import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { getSystemCardPillar } from '@/lib/services/system-card-service'
import { SystemCardPillarCodeSchema } from '@/lib/validations/system-card'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelIdentifier: string; pillarCode: string }> }
) {
  try {
    await getAuthenticatedSupabaseClient(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { modelIdentifier, pillarCode } = await params
  const decodedIdentifier = decodeURIComponent(modelIdentifier)
  const parsedCode = SystemCardPillarCodeSchema.safeParse(pillarCode)

  if (!decodedIdentifier.trim() || !parsedCode.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const pillar = await getSystemCardPillar(decodedIdentifier, parsedCode.data)
  if (!pillar) {
    return NextResponse.json({ pillar: null })
  }

  return NextResponse.json({ pillar })
}
