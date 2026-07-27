import { parse } from 'csv-parse/sync'

import { exactEcoLogitsMatchKey } from '@/lib/ecologits/normalization'

const REQUIRED_HEADERS = [
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

type RawCompariaRow = Record<(typeof REQUIRED_HEADERS)[number], string>

export type ParsedCompariaModel = {
  source_id: string
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
  llm_stats_id?: string | null
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

function releaseDate(value: string, rowNumber: number): string | null {
  const release = nullableText(value)
  if (!release) return null
  const match = /^(\d{2})\/(\d{4})$/.exec(release)
  if (!match) throw new Error(`Ligne ${rowNumber} : Release doit être au format MM/AAAA.`)
  const month = Number(match[1])
  if (month < 1 || month > 12) throw new Error(`Ligne ${rowNumber} : mois de sortie invalide.`)
  return `${match[2]}-${match[1]}-01`
}

export function parseCompariaCsv(csv: string): ParsedCompariaModel[] {
  const rows = parse(csv.replace(/^\uFEFF/, ''), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawCompariaRow[]

  if (rows.length === 0) throw new Error('Le fichier Compar:IA est vide.')
  const headers = Object.keys(rows[0] ?? {})
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Colonnes Compar:IA manquantes : ${missingHeaders.join(', ')}.`)
  }

  const sourceIds = new Set<string>()
  return rows.map((row, index) => {
    const rowNumber = index + 2
    const sourceId = nullableText(row.id)
    const organisation = nullableText(row.Organisation)
    if (!sourceId || !organisation) {
      throw new Error(`Ligne ${rowNumber} : id et Organisation sont obligatoires.`)
    }
    if (sourceIds.has(sourceId)) throw new Error(`Ligne ${rowNumber} : id dupliqué « ${sourceId} ».`)
    sourceIds.add(sourceId)

    const rank = numberValue(row.Rank, 'Rank', rowNumber)
    const votes = numberValue(row['Total votes'], 'Total votes', rowNumber)
    if (!Number.isInteger(rank) || rank <= 0) throw new Error(`Ligne ${rowNumber} : Rank doit être un entier positif.`)
    if (!Number.isInteger(votes) || votes < 0) throw new Error(`Ligne ${rowNumber} : Total votes doit être un entier positif ou nul.`)

    return {
      source_id: sourceId,
      rank,
      bradley_terry_score: numberValue(row['Bradley-Terry Score'], 'Bradley-Terry Score', rowNumber),
      bt_p2_5: nullableNumber(row['BT p2.5'], 'BT p2.5', rowNumber),
      bt_p97_5: nullableNumber(row['BT p97.5'], 'BT p97.5', rowNumber),
      confidence_interval: nullableText(row['Confidence interval']),
      rank_p2_5: nullableNumber(row['Rank p2.5'], 'Rank p2.5', rowNumber),
      rank_p97_5: nullableNumber(row['Rank p97.5'], 'Rank p97.5', rowNumber),
      total_votes: votes,
      consumption_mwh_per_1k_tokens: nullableNumber(row['Consumption mWh (1000 tokens)'], 'Consumption', rowNumber),
      size: nullableText(row.Size),
      parameters_billions: nullableNumber(row['Parameters (B)'], 'Parameters (B)', rowNumber),
      architecture: nullableText(row.Architecture),
      release_date: releaseDate(row.Release, rowNumber),
      organisation,
      license: nullableText(row.License),
      raw_payload: row,
    }
  })
}

export function findExactCompariaLinks(
  rows: ParsedCompariaModel[],
  canonicalModels: CompariaCanonicalModel[],
): Map<string, string> {
  const candidates = new Map<string, Set<string>>()
  for (const model of canonicalModels) {
    const keys = [
      model.llm_stats_id?.trim().toLowerCase(),
      exactEcoLogitsMatchKey(model.model_provider ?? '', model.model_name),
    ].filter((key): key is string => Boolean(key))
    for (const key of keys) {
      const ids = candidates.get(key) ?? new Set<string>()
      ids.add(model.id)
      candidates.set(key, ids)
    }
  }

  const links = new Map<string, string>()
  for (const row of rows) {
    const keys = [
      row.source_id.toLowerCase(),
      exactEcoLogitsMatchKey(row.organisation, row.source_id),
    ]
    const ids = new Set(keys.flatMap((key) => [...(candidates.get(key) ?? [])]))
    if (ids.size === 1) links.set(row.source_id, [...ids][0]!)
  }
  return links
}
