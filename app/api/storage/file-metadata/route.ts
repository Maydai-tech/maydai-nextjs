import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getClientFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'No authorization header' }
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid token' }
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getClientFromAuth(request) as any
    if (error) return NextResponse.json({ error }, { status: 401 })

    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // List the file to get its metadata
    const pathParts = filePath.split('/')
    const fileName = pathParts.pop()
    const folderPath = pathParts.join('/')

    const { data: files, error: listError } = await (supabase as any).storage
      .from('dossiers')
      .list(folderPath, {
        limit: 100,
        search: fileName
      })

    if (listError) {
      console.error('Error listing file:', listError)
      return NextResponse.json({ error: 'Failed to get file metadata' }, { status: 500 })
    }

    const file = files?.find((f: any) => f.name === fileName)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({
      name: file.name,
      size: file.metadata?.size || 0,
      created_at: file.created_at,
      updated_at: file.updated_at
    })
  } catch (e) {
    console.error('File metadata error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
