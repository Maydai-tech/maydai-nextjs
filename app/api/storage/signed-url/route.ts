import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractDossierStoragePath } from '@/lib/dossier-storage-path'
import { createDossierSignedUrl, userCanAccessDossierPath } from '@/lib/dossier-signed-url'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getClientFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'No authorization header' as const }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token' as const }
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getClientFromAuth(request)
    if ('error' in auth && auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }
    if (!('supabase' in auth) || !auth.supabase || !auth.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const rawPath = new URL(request.url).searchParams.get('path')
    const storagePath = extractDossierStoragePath(rawPath)
    if (!storagePath) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const allowed = await userCanAccessDossierPath(auth.supabase, auth.user.id, storagePath)
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const url = await createDossierSignedUrl(storagePath)
    if (!url) {
      return NextResponse.json({ error: 'Failed to sign url' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
