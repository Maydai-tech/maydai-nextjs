import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { verifyAdminAuth } from '@/lib/admin-auth'
import { syncCompariaCatalogFromDrive } from '@/lib/comparia/drive-sync'
import { createEcoLogitsServiceClient } from '@/lib/ecologits/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const cronHeader = request.headers.get('x-cron-secret')?.trim() ?? ''
  if (cronHeader && secretsMatch(cronHeader, secret)) return true

  const authorization = request.headers.get('authorization')?.trim() ?? ''
  const bearerPrefix = 'bearer '
  if (!authorization.toLowerCase().startsWith(bearerPrefix)) return false
  const token = authorization.slice(bearerPrefix.length).trim()
  return Boolean(token) && secretsMatch(token, secret)
}

function hasRejectedCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  const cronHeader = request.headers.get('x-cron-secret')
  if (cronHeader == null || cronHeader.trim() === '') return false
  if (!secret) return true
  return !secretsMatch(cronHeader.trim(), secret)
}

async function optionalFileName(request: NextRequest): Promise<string | undefined> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && typeof (body as { file_name?: unknown }).file_name === 'string') {
      return (body as { file_name: string }).file_name
    }
  } catch {
    return undefined
  }
  return undefined
}

async function handleSync(request: NextRequest, options: { cronOnly: boolean }) {
  if (hasRejectedCronSecret(request)) return unauthorized()

  if (!isCronAuthorized(request)) {
    if (options.cronOnly) return unauthorized()
    const auth = await verifyAdminAuth(request)
    if (auth.error) return auth.error
  }

  const fileName = request.method === 'POST' ? await optionalFileName(request) : undefined
  const result = await syncCompariaCatalogFromDrive(createEcoLogitsServiceClient(), fileName)
  return NextResponse.json({
    success: true,
    rowsImported: result.rowsImported,
    exactLinksCreated: result.exactLinksCreated,
    modelsDeactivated: result.modelsDeactivated,
    fileName: result.fileName,
  })
}

export async function GET(request: NextRequest) {
  try {
    return await handleSync(request, { cronOnly: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Synchronisation Drive impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleSync(request, { cronOnly: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('[Compar:IA] Synchronisation Drive impossible:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
