// ponytail: recherche Pappers minimale pour preprod ; main a lib/services/pappersService.ts (secteur, NAF…),
// à unifier quand Procurement rejoindra main.
export interface CompanySuggestion {
  siren: string
  name: string
  city: string | null
  postal_code: string | null
  activity: string | null
}

const MOCK_COMPANIES: CompanySuggestion[] = [
  { siren: '900000001', name: 'RECETTE TALENTS IA', city: 'Paris', postal_code: '75011', activity: 'Édition de logiciels' },
  { siren: '900000002', name: 'RECETTE CHATBOTS SANTÉ', city: 'Lyon', postal_code: '69002', activity: 'Conseil en systèmes informatiques' },
  { siren: '900000003', name: 'RECETTE DATA CONSEIL', city: 'Nantes', postal_code: '44000', activity: 'Traitement de données' },
]

interface PappersResult {
  siren?: string
  nom_entreprise?: string
  libelle_code_naf?: string | null
  entreprise_cessee?: boolean | number
  siege?: { ville?: string | null; code_postal?: string | null } | null
}

export function toPappersQuery(query: string): string {
  const cleaned = query.trim()
  const digits = cleaned.replace(/\s/g, '')
  // Un SIRET (14 chiffres) se cherche par son SIREN (9 premiers chiffres).
  return /^\d{14}$/.test(digits) ? digits.slice(0, 9) : /^\d+$/.test(digits) ? digits : cleaned
}

export function mapPappersResults(results: PappersResult[]): CompanySuggestion[] {
  return results
    .filter((item) => item.entreprise_cessee !== true && item.entreprise_cessee !== 1 && /^\d{9}$/.test(item.siren ?? '') && item.nom_entreprise)
    .map((item) => ({
      siren: item.siren!,
      name: item.nom_entreprise!.trim(),
      city: item.siege?.ville?.trim() || null,
      postal_code: item.siege?.code_postal?.trim() || null,
      activity: item.libelle_code_naf?.trim() || null,
    }))
}

export async function searchCompanies(query: string): Promise<CompanySuggestion[]> {
  const q = toPappersQuery(query)
  if (q.length < 2) return []

  if (process.env.PAPPERS_MOCK_MODE === 'true') {
    const needle = q.toLowerCase()
    return MOCK_COMPANIES.filter((company) => company.name.toLowerCase().includes(needle) || company.siren.startsWith(needle) || needle.includes('recette'))
  }

  const apiKey = process.env.PAPPERS_API_KEY?.trim()
  if (!apiKey) throw new Error('Configuration Pappers manquante (PAPPERS_API_KEY)')

  const url = new URL('https://api.pappers.fr/v2/recherche')
  url.searchParams.set('q', q)
  url.searchParams.set('api_token', apiKey)
  url.searchParams.set('par_page', '8')
  url.searchParams.set('entreprise_cessee', 'false')

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Pappers /v2/recherche HTTP ${response.status}`)
  const payload = await response.json() as { resultats?: PappersResult[] }
  return mapPappersResults(payload.resultats ?? [])
}
