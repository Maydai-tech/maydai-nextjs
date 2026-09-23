import type { ProviderLifecycleStatus } from '@/lib/bench-llm/provider-lifecycle'

const HEADER_ALIASES: Record<string, string> = {
  model_id: 'model_id',
  id: 'model_id',
  'model id': 'model_id',
  'modele id': 'model_id',
  'modèle id': 'model_id',
  model_name: 'model_name',
  'nom du modele': 'model_name',
  'nom du modèle': 'model_name',
  model_provider: 'model_provider',
  fournisseur: 'model_provider',
  model_type: 'model_type',
  type: 'model_type',
  version: 'version',
  principle_code: 'principle_code',
  'principe code': 'principle_code',
  benchmark_code: 'benchmark_code',
  'benchmark code': 'benchmark_code',
  score: 'score',
  'score original': 'score',
  score_text: 'score_text',
  'score text': 'score_text',
  evaluation_date: 'evaluation_date',
  'date d evaluation': 'evaluation_date',
  "date d'evaluation": 'evaluation_date',
  "date d'évaluation": 'evaluation_date',
  statut: 'lifecycle_status',
  status: 'lifecycle_status',
  'statut modele': 'lifecycle_status',
  'statut modèle': 'lifecycle_status',
  lifecycle: 'lifecycle_status',
  lifecycle_status: 'lifecycle_status',
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ComplAiCsvRow = {
  model_id: string | null
  model_name: string
  model_provider: string
  model_type: string
  version: string
  principle_code: string
  benchmark_code: string
  score: string
  score_text: string
  evaluation_date: string
  lifecycle_status: ProviderLifecycleStatus | null
}

const LIFECYCLE_CSV_ALIASES: Record<string, ProviderLifecycleStatus> = {
  actif: 'active',
  active: 'active',
  deprecie: 'deprecated',
  deprecated: 'deprecated',
  retire: 'retired',
  retired: 'retired',
  legacy: 'legacy',
}

const LIFECYCLE_CSV_LABELS: Record<ProviderLifecycleStatus, string> = {
  active: 'Actif',
  deprecated: 'Déprécié',
  retired: 'Retiré',
  legacy: 'Legacy',
}

export function parseComplAiLifecycleStatus(value: string | null | undefined): ProviderLifecycleStatus | null {
  if (!value) return null
  return LIFECYCLE_CSV_ALIASES[stripAccents(value).trim().toLowerCase()] ?? null
}

export function formatComplAiLifecycleStatus(status: ProviderLifecycleStatus | null | undefined): string {
  return status ? LIFECYCLE_CSV_LABELS[status] : ''
}

export type ComplAiImportStats = {
  totalRows: number
  modelsCreated: number
  modelsUpdated: number
  evaluationsCreated: number
  evaluationsUpdated: number
  errors: string[]
  warnings: string[]
}

export type ComplAiImportSummary = {
  success: boolean
  httpStatus: number
  message: string
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeHeader(header: string): string {
  return stripAccents(header).trim().toLowerCase().replace(/\s+/g, ' ')
}

function blankToEmpty(value: unknown): string {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  const lowered = trimmed.toLowerCase()
  if (lowered === 'n/a' || lowered === 'na') return ''
  return trimmed
}

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value))
}

export function parseCsvLine(line: string, separator = ','): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === separator && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }
    current += char
  }
  fields.push(current)
  return fields
}

export function parseComplAiCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const separator = lines[0]!.includes(';') && !lines[0]!.includes(',') ? ';' : ','
  const headers = parseCsvLine(lines[0]!, separator).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, separator)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

export function normalizeComplAiCsvRow(raw: Record<string, unknown> | null | undefined): ComplAiCsvRow {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw ?? {})) {
    const canonical = HEADER_ALIASES[normalizeHeader(key)]
    if (!canonical) continue
    mapped[canonical] = blankToEmpty(value)
  }

  let modelId = isUuid(mapped.model_id) ? mapped.model_id! : null
  let modelName = mapped.model_name || ''
  let modelProvider = mapped.model_provider || ''

  // Export mal recollé : UUID dans « Nom du modèle », nom affiché dans « Fournisseur ».
  if (!modelId && isUuid(modelName)) {
    modelId = modelName
    if (modelProvider && !isUuid(modelProvider)) {
      modelName = modelProvider
      modelProvider = ''
    } else {
      modelName = ''
    }
  }

  return {
    model_id: modelId,
    model_name: modelName,
    model_provider: modelProvider,
    model_type: mapped.model_type || '',
    version: mapped.version || '',
    principle_code: mapped.principle_code || '',
    benchmark_code: mapped.benchmark_code || '',
    score: mapped.score || '',
    score_text: mapped.score_text || '',
    evaluation_date: mapped.evaluation_date || '',
    lifecycle_status: parseComplAiLifecycleStatus(mapped.lifecycle_status),
  }
}

export function summarizeComplAiCsvImport(stats: ComplAiImportStats): ComplAiImportSummary {
  const saved = stats.evaluationsCreated + stats.evaluationsUpdated
  const errorCount = stats.errors.length

  if (stats.totalRows === 0) {
    return {
      success: false,
      httpStatus: 400,
      message: 'Import CSV échoué : fichier vide.',
    }
  }

  if (saved === 0) {
    const preview = stats.errors.slice(0, 2).join(' ')
    return {
      success: false,
      httpStatus: 422,
      message: `Import CSV échoué : ${errorCount} ligne(s) rejetée(s), aucun score enregistré.${preview ? ` ${preview}` : ''}`,
    }
  }

  if (errorCount > 0) {
    return {
      success: true,
      httpStatus: 200,
      message: `Import CSV partiel : ${saved} score(s) enregistré(s), ${errorCount} ligne(s) rejetée(s).`,
    }
  }

  return {
    success: true,
    httpStatus: 200,
    message: `Import CSV terminé : ${saved} score(s) enregistré(s).`,
  }
}
