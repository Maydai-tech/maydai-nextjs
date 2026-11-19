import { validateIndustrySelection } from '@/lib/validation/industries'
import { validateSIREN } from '../validation/siren'
import {
  NafIndustryMappingSchema,
  PappersCompanySuggestionSchema,
  PappersRawCompanySchema,
  PappersRawSearchResponseSchema,
  type NafIndustryMapping,
  type PappersCompanySuggestion,
  type PappersRawCompany,
} from '../validations/pappers'

const PAPPERS_RECHERCHE_URL = 'https://api.pappers.fr/v2/recherche'

/**
 * SIREN `123456782` : 9 chiffres et clé de Luhn valide pour `validateSIREN`
 * (qui double les positions paires en partant de la gauche). `999999999` est refusé.
 */
const ZUBROW_SIREN = '123456782'

const ZUBROW_CODE_NAF = '62.01Z'

interface NafTarget {
  mainIndustryId: NafIndustryMapping['mainIndustryId']
  subCategoryId: string
  annex_iii_sensitive: boolean
  annex_iii_domain: string | null
}

function buildNafMapping(target: NafTarget): NafIndustryMapping {
  const validation = validateIndustrySelection(target.mainIndustryId, target.subCategoryId)
  if (!validation.valid) {
    throw new Error(
      `[PappersService] Couple NAF invalide ${target.mainIndustryId}/${target.subCategoryId}: ${validation.error ?? ''}`
    )
  }
  return NafIndustryMappingSchema.parse(target)
}

/**
 * Division NAF (2 premiers chiffres INSEE) vers le catalogue MaydAI et l'Annexe III.
 * Retourne null si le code est vide ou ne contient pas deux chiffres.
 */
export function mapNafToMaydaiIndustry(codeNaf?: string | null): NafIndustryMapping | null {
  if (!codeNaf || codeNaf.trim() === '') return null

  const upper = codeNaf.trim().toUpperCase()
  const compact = upper.replace(/\./g, '')
  const digits = upper.replace(/\D/g, '')
  if (digits.length < 2) return null

  const division = Number.parseInt(digits.slice(0, 2), 10)
  const startsWith = (dotted: string, plain: string) =>
    upper.startsWith(dotted) || compact.startsWith(plain)

  if (division === 58 || division === 59 || division === 60) {
    return buildNafMapping({
      mainIndustryId: 'retail_media',
      subCategoryId: 'media',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 61) {
    return buildNafMapping({
      mainIndustryId: 'tech_data',
      subCategoryId: 'telecom',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Infrastructures critiques & Télécoms (Annexe III pt 2)',
    })
  }

  if (division === 62 || division === 63) {
    let subCategoryId = 'esn'
    if (startsWith('62.01', '6201')) subCategoryId = 'saas'
    else if (startsWith('63.11', '6311')) subCategoryId = 'ai_data'
    return buildNafMapping({
      mainIndustryId: 'tech_data',
      subCategoryId,
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 64 || division === 65 || division === 66) {
    const subCategoryId = division === 64 ? 'banking' : division === 65 ? 'insurance' : 'asset_mgmt'
    return buildNafMapping({
      mainIndustryId: 'finance',
      subCategoryId,
      annex_iii_sensitive: true,
      annex_iii_domain: 'Services financiers, solvabilité & assurance (Annexe III pt 5b/5c)',
    })
  }

  if (division === 86 || division === 87 || division === 88 || division === 21) {
    return buildNafMapping({
      mainIndustryId: 'health',
      subCategoryId: division === 21 ? 'pharma' : 'care_centers',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Santé & Soins médicaux (Annexe III)',
    })
  }

  if (division === 84) {
    return buildNafMapping({
      mainIndustryId: 'public_rh',
      subCategoryId: 'public_admin',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Services publics essentiels, Justice & Administration (Annexe III pt 5a/6/7/8)',
    })
  }

  if (division === 85) {
    return buildNafMapping({
      mainIndustryId: 'public_rh',
      subCategoryId: 'edtech',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Éducation & Formation professionnelle (Annexe III pt 3)',
    })
  }

  if (division === 78) {
    return buildNafMapping({
      mainIndustryId: 'public_rh',
      subCategoryId: 'hr',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Emploi, Recrutement & Gestion des travailleurs (Annexe III pt 4)',
    })
  }

  if (division === 69) {
    return buildNafMapping({
      mainIndustryId: 'services',
      subCategoryId: 'legal',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Administration de la justice & Droit (Annexe III pt 8)',
    })
  }

  if (division >= 70 && division <= 74) {
    return buildNafMapping({
      mainIndustryId: 'services',
      subCategoryId: 'consulting',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 35) {
    return buildNafMapping({
      mainIndustryId: 'industry',
      subCategoryId: 'energy',
      annex_iii_sensitive: true,
      annex_iii_domain: 'Infrastructures critiques : Énergie (Annexe III pt 2)',
    })
  }

  if (division === 1 || division === 2 || division === 3) {
    return buildNafMapping({
      mainIndustryId: 'industry',
      subCategoryId: 'agritech',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 20) {
    return buildNafMapping({
      mainIndustryId: 'industry',
      subCategoryId: 'chemistry',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 30) {
    return buildNafMapping({
      mainIndustryId: 'construction_transport',
      subCategoryId: 'aerospace',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division >= 10 && division <= 33) {
    return buildNafMapping({
      mainIndustryId: 'industry',
      subCategoryId: 'manufacturing',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 41 || division === 42 || division === 43) {
    return buildNafMapping({
      mainIndustryId: 'construction_transport',
      subCategoryId: 'construction',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 68) {
    return buildNafMapping({
      mainIndustryId: 'construction_transport',
      subCategoryId: 'proptech',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division >= 49 && division <= 53) {
    return buildNafMapping({
      mainIndustryId: 'construction_transport',
      subCategoryId: 'transport',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  if (division === 45 || division === 46 || division === 47) {
    return buildNafMapping({
      mainIndustryId: 'retail_media',
      subCategoryId: 'retail',
      annex_iii_sensitive: false,
      annex_iii_domain: null,
    })
  }

  return buildNafMapping({
    mainIndustryId: 'services',
    subCategoryId: 'consulting',
    annex_iii_sensitive: false,
    annex_iii_domain: null,
  })
}

function withSuggestedIndustry(suggestion: PappersCompanySuggestion): PappersCompanySuggestion {
  return PappersCompanySuggestionSchema.parse({
    ...suggestion,
    suggested_industry: mapNafToMaydaiIndustry(suggestion.code_naf),
  })
}

export const ZUBROW_MOCK_COMPANY: PappersCompanySuggestion = withSuggestedIndustry(
  PappersCompanySuggestionSchema.parse({
    siren: ZUBROW_SIREN,
    siret_siege: `${ZUBROW_SIREN}00015`,
    nom_entreprise: 'ZUBROW CORP (SANDBOX MAYDAI)',
    code_naf: ZUBROW_CODE_NAF,
    libelle_code_naf: 'Programmation informatique',
    adresse_complete: '1 RUE DE RIVOLI',
    code_postal: '75001',
    ville: 'PARIS',
    entreprise_cessee: false,
    is_mock: true,
  })
)

if (!validateSIREN(ZUBROW_MOCK_COMPANY.siren)) {
  throw new Error(
    `[PappersService] SIREN sandbox refusé par validateSIREN: ${ZUBROW_MOCK_COMPANY.siren}`
  )
}

function logPappersError(error: unknown): void {
  console.error('[PappersService]', error)
}

function digitsOnly(value: string | null | undefined): string | null {
  if (value == null) return null
  const digits = value.replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

function buildAdresseComplete(company: PappersRawCompany): string | null {
  const siege = company.siege
  if (!siege) return null
  const lines = [siege.adresse_ligne_1, siege.adresse_ligne_2]
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line.length > 0)
  return lines.length > 0 ? lines.join(', ') : null
}

function mapRawCompanyToSuggestion(company: PappersRawCompany): unknown {
  const siren = digitsOnly(company.siren)
  const nom =
    company.nom_entreprise?.trim() ||
    company.denomination?.trim() ||
    [company.prenom, company.nom].filter((part) => part && part.trim()).join(' ').trim()

  const codeNaf = company.code_naf?.trim() || null

  return {
    siren: siren ?? '',
    siret_siege: digitsOnly(company.siege?.siret),
    nom_entreprise: nom,
    code_naf: codeNaf,
    libelle_code_naf: company.libelle_code_naf?.trim() || null,
    adresse_complete: buildAdresseComplete(company),
    code_postal: company.siege?.code_postal?.trim() || null,
    ville: company.siege?.ville?.trim() || null,
    entreprise_cessee: company.entreprise_cessee === true,
    is_mock: false,
    suggested_industry: mapNafToMaydaiIndustry(codeNaf),
  }
}

/**
 * Valide un payload brut `/v2/recherche`, mappe les fiches et exclut les entreprises radiées.
 * `entreprise_cessee` accepté en booléen ou en `0` / `1` (format réel Pappers).
 */
export function mapPappersSearchPayload(payload: unknown): PappersCompanySuggestion[] {
  const parsed = PappersRawSearchResponseSchema.safeParse(payload)
  if (!parsed.success) {
    console.error('[PappersService]', parsed.error)
    throw new Error('Réponse Pappers /v2/recherche invalide')
  }

  const suggestions: PappersCompanySuggestion[] = []

  for (const item of parsed.data.resultats) {
    const company = PappersRawCompanySchema.parse(item)
    if (company.entreprise_cessee === true) {
      console.error(
        '[PappersService]',
        `Entreprise radiée ou cessée exclue (SIREN ${company.siren})`
      )
      continue
    }

    const suggestion = PappersCompanySuggestionSchema.safeParse(mapRawCompanyToSuggestion(company))
    if (!suggestion.success) {
      console.error('[PappersService]', suggestion.error)
      throw new Error(`Suggestion Pappers invalide pour le SIREN ${company.siren}`)
    }

    suggestions.push(withSuggestedIndustry(suggestion.data))
  }

  return suggestions
}

/**
 * Recherche d'entreprises actives.
 * « zubrow » et `PAPPERS_MOCK_MODE=true` court-circuitent l'API (sandbox).
 * Le paramètre Pappers `entreprise_cessee=false` est doublé d'un filtre local.
 */
export async function searchCompaniesPappers(query: string): Promise<PappersCompanySuggestion[]> {
  const cleaned = query.trim()
  if (cleaned.length < 2) return []

  if (cleaned.toLowerCase().includes('zubrow') || process.env.PAPPERS_MOCK_MODE === 'true') {
    return [withSuggestedIndustry(ZUBROW_MOCK_COMPANY)]
  }

  const apiKey = process.env.PAPPERS_API_KEY?.trim()
  if (!apiKey) {
    console.error('[PappersService] Missing PAPPERS_API_KEY')
    throw new Error('Configuration Pappers manquante (PAPPERS_API_KEY)')
  }

  const url = new URL(PAPPERS_RECHERCHE_URL)
  url.searchParams.set('q', cleaned)
  url.searchParams.set('api_token', apiKey)
  url.searchParams.set('par_page', '10')
  url.searchParams.set('entreprise_cessee', 'false')

  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch (error) {
    logPappersError(error)
    throw new Error('Appel Pappers /v2/recherche impossible')
  }

  if (!response.ok) {
    let detail = ''
    try {
      detail = await response.text()
    } catch (error) {
      logPappersError(error)
      throw new Error(`Pappers /v2/recherche HTTP ${response.status}`)
    }
    console.error('[PappersService]', `HTTP ${response.status}`, detail.slice(0, 500))
    throw new Error(`Pappers /v2/recherche HTTP ${response.status}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    logPappersError(error)
    throw new Error('Réponse Pappers /v2/recherche illisible (JSON)')
  }

  return mapPappersSearchPayload(payload)
}
