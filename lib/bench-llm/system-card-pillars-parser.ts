import type { SystemCardPillarCode } from '../validations/system-card'
import {
  categorizeStatusLabel,
  stripMarkdownBold,
  type StatusCategory,
} from './system-card-status-categories'

export const PILLAR_PARSE_FAILURE = 'Échec : piliers non générés'

export const SEEDED_PILLAR_CATALOG: Record<
  SystemCardPillarCode,
  { pillar_title: string; sections_covered: string }
> = {
  doc_technique: {
    pillar_title: 'Documentation Technique du Système (GPAI et Haut Risque)',
    sections_covered: 'Abstract, Model training and characteristics, Cyber evaluations',
  },
  data_governance: {
    pillar_title: 'Qualité et Gouvernance des Données (Art. 10)',
    sections_covered: 'Training data and process, Bias evaluations',
  },
  prompts_guardrails: {
    pillar_title: 'Instruction Système, Prompts et Garde-fous (Art. 13 & 14)',
    sections_covered: 'Prompt injection risk within agentic systems',
  },
  risk_management: {
    pillar_title: 'Système de Gestion des Risques (RSP)',
    sections_covered: 'RSP evaluations, CBRN evaluations',
  },
  surveillance_plan: {
    pillar_title: 'Plan de Surveillance Continue et Post-Déploiement',
    sections_covered: 'White-box interpretability investigations, Evaluation awareness',
  },
}

const PILLAR_BY_PART_NUMBER: Record<number, SystemCardPillarCode> = {
  1: 'doc_technique',
  2: 'data_governance',
  3: 'prompts_guardrails',
  4: 'risk_management',
  5: 'surveillance_plan',
}

const ENGLISH_HEADINGS: Array<{ fold: string; code: SystemCardPillarCode }> = [
  { fold: 'technical documentation', code: 'doc_technique' },
  { fold: 'data governance & bias', code: 'data_governance' },
  { fold: 'data governance and bias', code: 'data_governance' },
  { fold: 'prompts & safeguards', code: 'prompts_guardrails' },
  { fold: 'prompts and safeguards', code: 'prompts_guardrails' },
  { fold: 'rsp & risk assessment', code: 'risk_management' },
  { fold: 'rsp and risk assessment', code: 'risk_management' },
  { fold: 'monitoring & oversight', code: 'surveillance_plan' },
  { fold: 'monitoring and oversight', code: 'surveillance_plan' },
]

export type PillarParseRule = 'partie' | 'partie_without_1' | 'english'

export type ParsedComplianceRow = {
  exigence: string
  article: string
  application: string
  status_label: string
  status: StatusCategory
}

export type ParsedPillar = {
  pillar_code: SystemCardPillarCode
  pillar_title: string
  sections_covered: string
  summary: string
  key_points: string[]
  ai_act_compliance: ParsedComplianceRow[]
  recommendations: {
    fournisseur?: string
    integrateur?: string
    deployeur?: string
  }
}

export type PillarParseSuccess = {
  ok: true
  rule: PillarParseRule
  pillars: ParsedPillar[]
  unmappedLabels: string[]
}

export type PillarParseFailure = {
  ok: false
  error: string
}

export type PillarParseResult = PillarParseSuccess | PillarParseFailure

type PartSlice = {
  code: SystemCardPillarCode
  subtitle: string
  lines: string[]
}

export function formatImportedPillarStatus(importedOn: string, unmappedCount: number): string {
  if (unmappedCount <= 0) return `Importé le ${importedOn}`
  const noun = unmappedCount === 1 ? 'statut non reconnu' : 'statuts non reconnus'
  return `Importé le ${importedOn} (${unmappedCount} ${noun})`
}

function foldHeading(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function headingText(line: string): string | null {
  const match = line.match(/^#{1,6}\s+(.+?)\s*$/)
  return match?.[1]?.trim() ?? null
}

function partieHeading(text: string): { number: number; subtitle: string } | null {
  const match = text.match(/^partie\s*([1-5])\b[:.\-\u2013\u2014]?\s*(.*)$/i)
  if (!match) return null
  return { number: Number(match[1]), subtitle: match[2].replace(/^[:.\-\u2013\u2014]+\s*/, '').trim() }
}

function englishCode(text: string): SystemCardPillarCode | null {
  const folded = foldHeading(text).replace(/\s*&\s*/g, ' & ')
  return ENGLISH_HEADINGS.find((item) => item.fold === folded)?.code ?? null
}

function subsectionKind(text: string): 'summary' | 'points' | 'compliance' | 'recommendations' | null {
  const folded = foldHeading(text)
  if (/^1[\.\)]\s/.test(folded) && folded.includes('resum')) return 'summary'
  if (/^2[\.\)]\s/.test(folded) && folded.includes('point')) return 'points'
  if (/^3[\.\)]\s/.test(folded) && folded.includes('conform')) return 'compliance'
  if (/^4[\.\)]\s/.test(folded) && folded.includes('recommand')) return 'recommendations'
  return null
}

function findPartieMarkers(lines: string[]): Array<{ number: number; subtitle: string; index: number }> {
  const markers = []
  for (let index = 0; index < lines.length; index += 1) {
    const text = headingText(lines[index] ?? '')
    if (!text) continue
    const partie = partieHeading(text)
    if (partie) markers.push({ ...partie, index })
  }
  return markers
}

function findEnglishMarkers(lines: string[]): Array<{ code: SystemCardPillarCode; subtitle: string; index: number }> {
  const markers = []
  for (let index = 0; index < lines.length; index += 1) {
    const text = headingText(lines[index] ?? '')
    if (!text) continue
    const code = englishCode(text)
    if (code) markers.push({ code, subtitle: text.trim(), index })
  }
  return markers
}

function sliceAfter(lines: string[], start: number, end: number): string[] {
  return lines.slice(start + 1, end)
}

function partsFromPartie(lines: string[]): { rule: PillarParseRule; parts: PartSlice[] } | null {
  const markers = findPartieMarkers(lines)
  const numbers = markers.map((marker) => marker.number)
  const unique = new Set(numbers)
  if (unique.size !== numbers.length) return null

  const hasAll = [1, 2, 3, 4, 5].every((number) => unique.has(number))
  if (hasAll) {
    const ordered = [...markers].sort((a, b) => a.number - b.number)
    return {
      rule: 'partie',
      parts: ordered.map((marker, position) => ({
        code: PILLAR_BY_PART_NUMBER[marker.number]!,
        subtitle: marker.subtitle,
        lines: sliceAfter(lines, marker.index, ordered[position + 1]?.index ?? lines.length),
      })),
    }
  }

  const hasTail = [2, 3, 4, 5].every((number) => unique.has(number)) && !unique.has(1)
  if (!hasTail || markers.length !== 4) return null
  const ordered = [...markers].sort((a, b) => a.number - b.number)
  const leading = lines.slice(0, ordered[0]!.index)
  if (!hasFourSubsections(leading)) return null
  return {
    rule: 'partie_without_1',
    parts: [
      {
        code: 'doc_technique',
        subtitle: '',
        lines: leading,
      },
      ...ordered.map((marker, position) => ({
        code: PILLAR_BY_PART_NUMBER[marker.number]!,
        subtitle: marker.subtitle,
        lines: sliceAfter(lines, marker.index, ordered[position + 1]?.index ?? lines.length),
      })),
    ],
  }
}

function hasFourSubsections(lines: string[]): boolean {
  const kinds = new Set<string>()
  for (const line of lines) {
    const text = headingText(line) ?? line.replace(/^#{1,6}\s+/, '')
    const kind = subsectionKind(text)
    if (kind) kinds.add(kind)
  }
  return kinds.size === 4
}

function partsFromEnglish(lines: string[]): PartSlice[] | null {
  const markers = findEnglishMarkers(lines)
  const codes = markers.map((marker) => marker.code)
  const expected: SystemCardPillarCode[] = [
    'doc_technique',
    'data_governance',
    'prompts_guardrails',
    'risk_management',
    'surveillance_plan',
  ]
  if (codes.length !== 5 || expected.some((code) => !codes.includes(code))) return null
  const ordered = expected.map((code) => markers.find((marker) => marker.code === code)!)
  return ordered.map((marker, position) => ({
    code: marker.code,
    subtitle: marker.subtitle,
    lines: sliceAfter(lines, marker.index, ordered[position + 1]?.index ?? lines.length),
  }))
}

function splitSubsections(lines: string[]): Record<'summary' | 'points' | 'compliance' | 'recommendations', string[]> {
  const buckets = {
    summary: [] as string[],
    points: [] as string[],
    compliance: [] as string[],
    recommendations: [] as string[],
  }
  let current: keyof typeof buckets | null = null
  const loose: string[] = []
  for (const line of lines) {
    const text = headingText(line)
    const kind = text ? subsectionKind(text) : subsectionKind(line.trim())
    if (kind) {
      current = kind
      continue
    }
    if (current) buckets[current].push(line)
    else loose.push(line)
  }
  if (buckets.summary.length === 0) buckets.summary = loose
  return buckets
}

function bulletText(line: string): string | null {
  const match = line.match(/^\s*[-*+]\s+(.+)$/)
  return match?.[1]?.trim() || null
}

function parseTable(lines: string[]): ParsedComplianceRow[] {
  const rows: ParsedComplianceRow[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const rawCells = trimmed.split('|').slice(1, -1).map((cell) => cell.trim())
    if (rawCells.length > 0 && rawCells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue
    const cells = trimmed.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 4) continue
    const folded = foldHeading(cells[0] ?? '')
    if (folded.includes('exigence') || folded === 'statut') continue
    const statusLabel = stripMarkdownBold(cells[3] ?? '')
    if (!statusLabel && !cells[0]) continue
    rows.push({
      exigence: cells[0] ?? '',
      article: cells[1] ?? '',
      application: cells[2] ?? '',
      status_label: statusLabel,
      status: categorizeStatusLabel(statusLabel),
    })
  }
  return rows
}

const ROLE_LINE = new RegExp(
  [
    '^(?:pour\\s+(?:le\\s+|l[\'’]\\s*)|si\\s+votre\\s+entreprise\\s+agit\\s+en\\s+tant\\s+(?:que\\s+|qu[\'’]\\s*))?',
    '(fournisseur|int[eé]grateur|d[eé]ployeur)\\b',
    '(?:\\s*\\([^)]*\\))?\\s*[:：]\\s*(.*)$',
  ].join(''),
  'i',
)

function recommendationRole(label: string): keyof ParsedPillar['recommendations'] | null {
  const folded = foldHeading(label)
  if (folded.startsWith('fournisseur')) return 'fournisseur'
  if (folded.startsWith('integrateur')) return 'integrateur'
  if (folded.startsWith('deployeur')) return 'deployeur'
  return null
}

function matchRoleLine(line: string): { role: keyof ParsedPillar['recommendations']; rest: string } | null {
  const withoutBullet = line.trim().replace(/^(?:[-*+]\s+)+/, '')
  const plain = stripMarkdownBold(withoutBullet)
  const match = plain.match(ROLE_LINE)
  if (!match) return null
  const role = recommendationRole(match[1] ?? '')
  if (!role) return null
  return { role, rest: (match[2] ?? '').trim() }
}

function parseRecommendations(lines: string[]): ParsedPillar['recommendations'] {
  const recommendations: ParsedPillar['recommendations'] = {}
  let current: keyof ParsedPillar['recommendations'] | null = null
  const chunks: string[] = []
  const flush = () => {
    if (!current) return
    const text = chunks.join(' ').replace(/\s+/g, ' ').trim()
    if (text) recommendations[current] = text
    chunks.length = 0
  }
  for (const line of lines) {
    if (headingText(line)) {
      flush()
      current = null
      continue
    }
    const match = matchRoleLine(line)
    if (match) {
      flush()
      current = match.role
      if (match.rest) chunks.push(match.rest)
      continue
    }
    if (!current || !line.trim()) continue
    const piece = stripMarkdownBold(line.trim().replace(/^(?:[-*+]\s+)+/, ''))
    if (piece) chunks.push(piece)
  }
  flush()
  return recommendations
}

function prose(lines: string[]): string {
  return lines
    .filter((line) => line.trim() && !line.trim().startsWith('|') && !bulletText(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildPillar(part: PartSlice): ParsedPillar {
  const sections = splitSubsections(part.lines)
  const catalog = SEEDED_PILLAR_CATALOG[part.code]
  const keyPoints = sections.points.map(bulletText).filter((item): item is string => Boolean(item))
  const loosePoints = keyPoints.length > 0
    ? keyPoints
    : part.lines.map(bulletText).filter((item): item is string => Boolean(item))
  const compliance = parseTable(sections.compliance.length > 0 ? sections.compliance : part.lines)
  const recommendations = parseRecommendations(
    sections.recommendations.length > 0 ? sections.recommendations : part.lines,
  )
  return {
    pillar_code: part.code,
    pillar_title: catalog.pillar_title,
    sections_covered: part.subtitle || catalog.sections_covered,
    summary: prose(sections.summary),
    key_points: loosePoints,
    ai_act_compliance: compliance,
    recommendations,
  }
}

export function parseSystemCardPillars(markdown: string): PillarParseResult {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const partie = partsFromPartie(lines)
  const english = partie ? null : partsFromEnglish(lines)
  const selected = partie ?? (english ? { rule: 'english' as const, parts: english } : null)
  if (!selected || selected.parts.length !== 5) {
    return {
      ok: false,
      error: 'Le markdown ne contient pas exactement cinq parties reconnues.',
    }
  }
  const pillars = selected.parts.map(buildPillar)
  const codes = new Set(pillars.map((pillar) => pillar.pillar_code))
  if (codes.size !== 5) {
    return { ok: false, error: 'Les cinq piliers ne sont pas tous distincts.' }
  }
  const unmappedLabels = pillars.flatMap((pillar) =>
    pillar.ai_act_compliance
      .filter((row) => row.status === 'UNMAPPED')
      .map((row) => row.status_label)
      .filter(Boolean),
  )
  return { ok: true, rule: selected.rule, pillars, unmappedLabels }
}
