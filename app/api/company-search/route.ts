import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/api-auth'
import { searchCompanies } from '@/lib/services/companySearch'

export async function GET(request: NextRequest) {
  try { await getAuthenticatedSupabaseClient(request) } catch {
    return NextResponse.json({ error: 'Veuillez vous connecter pour rechercher une entreprise.' }, { status: 401 })
  }
  try {
    const results = await searchCompanies(request.nextUrl.searchParams.get('q') ?? '')
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch (error) {
    console.error('[CompanySearch]', error)
    return NextResponse.json({ error: 'La recherche d’entreprise est indisponible. Saisissez l’entreprise sans recherche.' }, { status: 502 })
  }
}
