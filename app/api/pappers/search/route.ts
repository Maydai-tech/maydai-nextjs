import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { searchCompaniesPappers } from '@/lib/services/pappersService'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[API /api/pappers/search]', 'Configuration Supabase manquante')
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 })
    }

    const response = NextResponse.next()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: Parameters<NextResponse['cookies']['set']>[2]
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (query.length < 2) {
      return NextResponse.json(
        { results: [] },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
      )
    }

    const results = await searchCompaniesPappers(query)
    const json = NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    )
    response.cookies.getAll().forEach((cookie) => {
      json.cookies.set(cookie)
    })
    return json
  } catch (error) {
    console.error('[API /api/pappers/search]', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche Pappers' }, { status: 500 })
  }
}
