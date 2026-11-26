import { parse } from 'csv-parse/sync'

import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
import { resolveAliasTargetId, type AliasRecord, type LineageModel } from '@/lib/bench-llm/model-lineage'
import { exactEcoLogitsMatchKey } from '@/lib/ecologits/normalization'

const LEGACY_HEADERS = [
  'Rank',
  'id',
  'Bradley-Terry Score',
  'BT p2.5',
  'BT p97.5',
  'Confidence interval',
  'Rank p2.5',
  'Rank p97.5',
  'Total votes',
  'Consumption mWh (1000 tokens)',
  'Size',
  'Parameters (B)',
  'Architecture',
  'Release',
  'Organisation',
  'License',
] as const

/** Contrat officiel Etalab 2.0 : les 16 colonnes historiques plus `Class`. */
export const ETALAB_HEADERS = ['Class', ...LEGACY_HEADERS] as const

const RELEASE_MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

type RawCompariaRow = Record<string, string>

export type ParsedCompariaModel = {
  source_id: string
  ranking_class: number | null
  rank: number
  bradley_terry_score: number
  bt_p2_5: number | null
  bt_p97_5: number | null
  confidence_interval: string | null
  rank_p2_5: number | null
  rank_p97_5: number | null
  total_votes: number
  consumption_mwh_per_1k_tokens: number | null
  size: string | null
  parameters_billions: number | null
  architecture: string | null
  release_date: string | null
  organisation: string
  license: string | null
  raw_payload: RawCompariaRow
}

export type CompariaCanonicalModel = {
  id: string
  model_name: string
  model_provider: string | null
  slug?: string | null
  llm_stats_id?: string | null
  llm_stats_ids?: string[]
  merged_into_id?: string | null
}

export type CompariaHubLink = {
  modelId: string
  matchMethod: 'exact' | 'slug'
}

function nullableText(value: string): string | null {
  const trimmed = value.trim()
  return !trimmed || trimmed.toLowerCase() === 'n/a' ? null : trimmed
}

function numberValue(value: string, label: string, rowNumber: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Ligne ${rowNumber} : ${label} doit être un nombre.`)
  }
  return parsed
}

function nullableNumber(value: string, label: string, rowNumber: number): number | null {
  return nullableText(value) == null ? null : numberValue(value, label, rowNumber)
}

function integerValue(value: string, label: string, rowNumber: number): number {
  const parsed = numberValue(value, label, rowNumber)
  if (!Number.isInteger(parsed)) {
    throw new Error(`Ligne ${rowNumber} : ${label} doit être un entier.`)
  }
  return parsed
}

function nullableInteger(value: string, label: string, rowNumber: number): number | null {
  return nullableText(value) == null ? null : integerValue(value, label, rowNumber)
}

function legacyReleaseDate(value: string, rowNumber: number): string | null {
  const release = nullableText(value)
  if (!release) return null
  const match = /^(\d{2})\/(\d{4})$/.exec(release)
  if (!match) throw new Error(`Ligne ${rowNumber} : Release doit être au format MM/AAAA.`)
  const month = Number(match[1])
  if (month < 1 || month > 12) throw new Error(`Ligne ${rowNumber} : mois de sortie invalide.`)
  return `${match[2]}-${match[1]}-01`
}

/**
 * Extrait le jour calendaire écrit dans la chaîne, sans `Date.parse`
 * (un `GMT+0100` / `GMT+0200` avant 01:00 reculerait sinon au jour précédent).
 */
export function parseCompariaReleaseDate(value: string, rowNumber: number): string | null {
  const release = nullableText(value)
  if (!release) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(release)
  if (iso) {
    const month = Number(iso[2])
    const day = Number(iso[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`Ligne ${rowNumber} : Release invalide.`)
    }
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }
  const jsDate = /^(?:[A-Za-z]{3}[.,]?\s+)?([A-Za-z]{3})[.,]?\s+(\d{1,2})\s+(\d{4})\b/.exec(release)
  if (!jsDate) {
    throw new Error(
      `Ligne ${rowNumber} : Release doit être une date JavaScript (« Tue Sep 22 2026 … ») ou ISO (YYYY-MM-DD), reçu « ${release} ».`,
    )
  }
  const month = RELEASE_MONTHS[jsDate[1]!.toLowerCase()]
  const day = Number(jsDate[2])
  if (!month || day < 1 || day > 31) {
    throw new Error(`Ligne ${rowNumber} : mois ou jour de Release illisible (« ${release} »).`)
  }
  return `${jsDate[3]}-${month}-${String(day).padStart(2, '0')}`
}

/** mWh / 1 000 tokens (CSV) → Wh / 1 000 tokens (colonne consolidée `consumption_wh_per_1k_tokens`). */
export function compariaConsumptionToWhPer1k(mwh: number | null): number | null {
  if (mwh == null) return null
  return mwh / 1000
}

export function compariaRankingDateFromFileName(fileName: string, now = new Date()): string {
  const match = /comparia_model-ranking-(\d{2})_(\d{2})_(\d{4})(?:-|\.)/i.exec(fileName)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function missingHeaders(headers: string[], required: readonly string[]): string[] {
  return required.filter((header) => !headers.includes(header))
}

function readCompariaRows(csv: string): RawCompariaRow[] {
  const cleaned = csv.replace(/^\uFEFF/, '')
  if (!cleaned.trim()) throw new Error('Le fichier Compar:IA est vide.')
  let rows: RawCompariaRow[]
  try {
    rows = parse(cleaned, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as RawCompariaRow[]
  } catch {
    throw new Error('Fichier CSV illisible. Attendu : CSV Etalab 2.0, séparateur virgule, encodage UTF-8.')
  }
  if (rows.length === 0) throw new Error('Le fichier Compar:IA est vide.')
  return rows
}

function sharedCompariaFields(row: RawCompariaRow, rowNumber: number, releaseDate: string | null) {
  const sourceId = nullableText(row.id)
  const organisation = nullableText(row.Organisation)
  if (!sourceId || !organisation) {
    throw new Error(`Ligne ${rowNumber} : id et Organisation sont obligatoires.`)
  }
  const rank = integerValue(row.Rank, 'Rank', rowNumber)
  const votes = integerValue(row['Total votes'], 'Total votes', rowNumber)
  if (rank <= 0) throw new Error(`Ligne ${rowNumber} : Rank doit être un entier positif.`)
  if (votes < 0) throw new Error(`Ligne ${rowNumber} : Total votes doit être un entier positif ou nul.`)
  return {
    source_id: sourceId,
    rank,
    bradley_terry_score: integerValue(row['Bradley-Terry Score'], 'Bradley-Terry Score', rowNumber),
    bt_p2_5: nullableInteger(row['BT p2.5'], 'BT p2.5', rowNumber),
    bt_p97_5: nullableInteger(row['BT p97.5'], 'BT p97.5', rowNumber),
    confidence_interval: nullableText(row['Confidence interval']),
    rank_p2_5: nullableInteger(row['Rank p2.5'], 'Rank p2.5', rowNumber),
    rank_p97_5: nullableInteger(row['Rank p97.5'], 'Rank p97.5', rowNumber),
    total_votes: votes,
    consumption_mwh_per_1k_tokens: nullableNumber(
      row['Consumption mWh (1000 tokens)'],
      'Consumption mWh (1000 tokens)',
      rowNumber,
    ),
    size: nullableText(row.Size),
    parameters_billions: nullableNumber(row['Parameters (B)'], 'Parameters (B)', rowNumber),
    architecture: nullableText(row.Architecture),
    release_date: releaseDate,
    organisation,
    license: nullableText(row.License),
    raw_payload: row,
  }
}

function assertUniqueSourceIds(sourceIds: Set<string>, sourceId: string, rowNumber: number) {
  if (sourceIds.has(sourceId)) throw new Error(`Ligne ${rowNumber} : id dupliqué « ${sourceId} ».`)
  sourceIds.add(sourceId)
}

function parseLegacyRows(rows: RawCompariaRow[]): ParsedCompariaModel[] {
  const headers = Object.keys(rows[0] ?? {})
  const absent = missingHeaders(headers, LEGACY_HEADERS)
  if (absent.length > 0) {
    throw new Error(`Colonnes Compar:IA manquantes : ${absent.join(', ')}.`)
  }
  const sourceIds = new Set<string>()
  return rows.map((row, index) => {
    const rowNumber = index + 2
    const parsed = sharedCompariaFields(row, rowNumber, legacyReleaseDate(row.Release, rowNumber))
    assertUniqueSourceIds(sourceIds, parsed.source_id, rowNumber)
    return { ...parsed, ranking_class: null }
  })
}

function parseEtalabRows(rows: RawCompariaRow[]): ParsedCompariaModel[] {
  const headers = Object.keys(rows[0] ?? {})
  const absent = missingHeaders(headers, ETALAB_HEADERS)
  if (absent.length > 0) {
    throw new Error(`Colonnes Compar:IA manquantes : ${absent.join(', ')}.`)
  }
  const sourceIds = new Set<string>()
  return rows.map((row, index) => {
    const rowNumber = index + 2
    const rankingClass = integerValue(row.Class, 'Class', rowNumber)
    if (rankingClass <= 0) throw new Error(`Ligne ${rowNumber} : Class doit être un entier positif.`)
    const parsed = sharedCompariaFields(row, rowNumber, parseCompariaReleaseDate(row.Release, rowNumber))
    assertUniqueSourceIds(sourceIds, parsed.source_id, rowNumber)
    return { ...parsed, ranking_class: rankingClass }
  })
}

/**
 * Accepte le CSV Etalab 2.0 (17 colonnes) et l’ancien export à 16 colonnes
 * encore utilisé par les imports Drive historiques.
 */
export function parseCompariaCsv(csv: string): ParsedCompariaModel[] {
  const rows = readCompariaRows(csv)
  const headers = Object.keys(rows[0] ?? {})
  const legacyComplete = missingHeaders(headers, LEGACY_HEADERS).length === 0
  if (!headers.includes('Class') && legacyComplete) return parseLegacyRows(rows)
  return parseEtalabRows(rows)
}

/** Rejette tout fichier qui n’a pas exactement les 17 en-têtes Etalab 2.0. */
export function parseCompariaEtalabCsv(csv: string): ParsedCompariaModel[] {
  const cleaned = csv.replace(/^\uFEFF/, '')
  const firstLine = cleaned.split(/\r?\n/).find((line) => line.trim()) ?? ''
  if (firstLine.trimStart().startsWith('<')) {
    throw new Error(
      'Ce fichier ressemble à un ancien scraping HTML, pas au CSV officiel Etalab 2.0 (17 colonnes, séparateur virgule).',
    )
  }
  return parseEtalabRows(readCompariaRows(csv))
}

type CandidateHit = { id: string; method: 'exact' | 'slug' }

function addCandidate(
  candidates: Map<string, CandidateHit[]>,
  key: string | null | undefined,
  modelId: string,
  method: 'exact' | 'slug',
) {
  if (!key) return
  const hits = candidates.get(key) ?? []
  if (!hits.some((hit) => hit.id === modelId)) hits.push({ id: modelId, method })
  candidates.set(key, hits)
}

function llmStatsIdsFor(model: CompariaCanonicalModel): string[] {
  const ids = [
    ...(model.llm_stats_ids ?? []),
    ...(model.llm_stats_id ? [model.llm_stats_id] : []),
  ]
  return [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))]
}

/**
 * Associe une ligne Compar:IA au hub `compl_ai_models` via identifiant LLM Stats,
 * nom, clé EcoLogits, ou slug. Un match n'est retenu que s'il est unique.
 */
export function findCompariaHubLinks(
  rows: ParsedCompariaModel[],
  canonicalModels: CompariaCanonicalModel[],
  aliases: readonly AliasRecord[] = [],
): Map<string, CompariaHubLink> {
  const lineage = new Map<string, LineageModel>(canonicalModels.map((model) => [model.id, {
    id: model.id,
    mergedIntoId: model.merged_into_id ?? null,
  }]))
  const links = new Map<string, CompariaHubLink>()
  for (const row of rows) {
    const target = resolveAliasTargetId(aliases, [...lineage.values()], {
      source: 'comparia',
      sourceId: row.source_id,
      normalizedName: normalizeLlmModelSlug(row.source_id) ?? row.source_id.toLowerCase(),
    })
    if (target) links.set(row.source_id, { modelId: target, matchMethod: 'exact' })
  }

  const candidates = new Map<string, CandidateHit[]>()
  for (const model of canonicalModels) {
    for (const sourceId of llmStatsIdsFor(model)) {
      addCandidate(candidates, sourceId, model.id, 'exact')
    }
    addCandidate(
      candidates,
      exactEcoLogitsMatchKey(model.model_provider ?? '', model.model_name),
      model.id,
      'exact',
    )
    addCandidate(candidates, model.model_name.trim().toLowerCase(), model.id, 'exact')
    addCandidate(
      candidates,
      model.slug ?? normalizeLlmModelSlug(model.model_name),
      model.id,
      'slug',
    )
  }

  for (const row of rows) {
    if (links.has(row.source_id)) continue
    const lookups: Array<{ key: string | null; method: 'exact' | 'slug' }> = [
      { key: row.source_id.toLowerCase(), method: 'exact' },
      { key: exactEcoLogitsMatchKey(row.organisation, row.source_id), method: 'exact' },
      { key: normalizeLlmModelSlug(row.source_id), method: 'slug' },
    ]
    const hits = lookups.flatMap((lookup) => {
      if (!lookup.key) return []
      return (candidates.get(lookup.key) ?? []).map((hit) => ({
        id: hit.id,
        method: hit.method === 'exact' && lookup.method === 'exact' ? 'exact' as const : 'slug' as const,
      }))
    })
    const uniqueIds = [...new Set(hits.map((hit) => hit.id))]
    if (uniqueIds.length !== 1) continue
    const modelId = uniqueIds[0]!
    const matchMethod = hits.some((hit) => hit.id === modelId && hit.method === 'exact')
      ? 'exact'
      : 'slug'
    links.set(row.source_id, { modelId, matchMethod })
  }
  return links
}

export function findExactCompariaLinks(
  rows: ParsedCompariaModel[],
  canonicalModels: CompariaCanonicalModel[],
): Map<string, string> {
  return new Map(
    [...findCompariaHubLinks(rows, canonicalModels)].map(([sourceId, link]) => [
      sourceId,
      link.modelId,
    ]),
  )
}
