import type { SupabaseClient } from '@supabase/supabase-js'

import {
  parseSystemCardPillars,
  type ParsedPillar,
  type PillarParseRule,
} from './system-card-pillars-parser'
import type { SystemCardPillarCode } from '../validations/system-card'

export const SEEDED_SYSTEM_CARD_IDENTIFIER = 'claude-sonnet-4-5'

export type StoredPillarSnapshot = {
  pillar_code: SystemCardPillarCode
  pillar_title: string
  sections_covered: string
  summary: string
  key_points: string[]
  ai_act_compliance: Array<{ status?: string; status_label?: string }>
  recommendations: Record<string, string | undefined>
}

export type PillarRebuildCardInput = {
  id: string
  model_identifier: string
  source_markdown: string | null
}

export type PillarRebuildCardReport = {
  modelIdentifier: string
  rule: PillarParseRule | null
  complianceCounts: number[]
  unmappedCount: number
  error: string | null
  written: boolean
}

export type SeedPillarDiff = {
  pillarCode: SystemCardPillarCode
  titleEqual: boolean
  sectionsEqual: boolean
  summaryEqual: boolean
  keyPointCount: { existing: number; generated: number }
  complianceCount: { existing: number; generated: number }
}

export type PillarRebuildReport = {
  dryRun: boolean
  replaceSeededCard: boolean
  cards: number
  parsed: number
  failed: number
  byRule: Record<PillarParseRule, number>
  unmapped: Array<{ label: string; count: number }>
  perCard: PillarRebuildCardReport[]
  seedComparison: {
    modelIdentifier: string
    existingPillarCount: number
    generated: boolean
    replaced: boolean
    diffs: SeedPillarDiff[]
  } | null
}

type PreparedCard = {
  input: PillarRebuildCardInput
  pillars: ParsedPillar[] | null
  rule: PillarParseRule | null
  error: string | null
  unmappedLabels: string[]
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function preparePillarRebuild(cards: PillarRebuildCardInput[]): PreparedCard[] {
  return cards.map((card) => {
    const markdown = card.source_markdown?.trim() ?? ''
    if (!markdown) {
      return { input: card, pillars: null, rule: null, error: 'Markdown source vide.', unmappedLabels: [] }
    }
    const parsed = parseSystemCardPillars(markdown)
    if (!parsed.ok) {
      return { input: card, pillars: null, rule: null, error: parsed.error, unmappedLabels: [] }
    }
    return {
      input: card,
      pillars: parsed.pillars,
      rule: parsed.rule,
      error: null,
      unmappedLabels: parsed.unmappedLabels,
    }
  })
}

function seedDiffs(existing: StoredPillarSnapshot[], generated: ParsedPillar[]): SeedPillarDiff[] {
  return generated.map((pillar) => {
    const current = existing.find((item) => item.pillar_code === pillar.pillar_code)
    return {
      pillarCode: pillar.pillar_code,
      titleEqual: current?.pillar_title === pillar.pillar_title,
      sectionsEqual: current?.sections_covered === pillar.sections_covered,
      summaryEqual: current?.summary === pillar.summary,
      keyPointCount: {
        existing: current ? asStringArray(current.key_points).length : 0,
        generated: pillar.key_points.length,
      },
      complianceCount: {
        existing: current?.ai_act_compliance?.length ?? 0,
        generated: pillar.ai_act_compliance.length,
      },
    }
  })
}

export function buildPillarRebuildReport(params: {
  cards: PillarRebuildCardInput[]
  existingSeedPillars?: StoredPillarSnapshot[]
  dryRun: boolean
  replaceSeededCard: boolean
  writtenIdentifiers?: string[]
}): PillarRebuildReport {
  const prepared = preparePillarRebuild(params.cards)
  const written = new Set(params.writtenIdentifiers ?? [])
  const byRule: Record<PillarParseRule, number> = {
    partie: 0,
    partie_without_1: 0,
    english: 0,
  }
  const unmappedCounts = new Map<string, number>()
  for (const card of prepared) {
    if (card.rule) byRule[card.rule] += 1
    for (const label of card.unmappedLabels) {
      unmappedCounts.set(label, (unmappedCounts.get(label) ?? 0) + 1)
    }
  }
  const seed = prepared.find((card) => card.input.model_identifier === SEEDED_SYSTEM_CARD_IDENTIFIER)
  return {
    dryRun: params.dryRun,
    replaceSeededCard: params.replaceSeededCard,
    cards: prepared.length,
    parsed: prepared.filter((card) => card.pillars).length,
    failed: prepared.filter((card) => card.error).length,
    byRule,
    unmapped: [...unmappedCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr')),
    perCard: prepared.map((card) => ({
      modelIdentifier: card.input.model_identifier,
      rule: card.rule,
      complianceCounts: card.pillars?.map((pillar) => pillar.ai_act_compliance.length) ?? [],
      unmappedCount: card.unmappedLabels.length,
      error: card.error,
      written: written.has(card.input.model_identifier),
    })),
    seedComparison: seed
      ? {
          modelIdentifier: SEEDED_SYSTEM_CARD_IDENTIFIER,
          existingPillarCount: params.existingSeedPillars?.length ?? 0,
          generated: Boolean(seed.pillars),
          replaced: written.has(SEEDED_SYSTEM_CARD_IDENTIFIER),
          diffs: seed.pillars ? seedDiffs(params.existingSeedPillars ?? [], seed.pillars) : [],
        }
      : null,
  }
}

function pillarRows(cardId: string, pillars: ParsedPillar[]) {
  return pillars.map((pillar) => ({
    system_card_id: cardId,
    pillar_code: pillar.pillar_code,
    pillar_title: pillar.pillar_title,
    sections_covered: pillar.sections_covered,
    summary: pillar.summary,
    key_points: pillar.key_points,
    ai_act_compliance: pillar.ai_act_compliance,
    recommendations: pillar.recommendations,
  }))
}

export async function rebuildSystemCardPillars(
  supabase: SupabaseClient,
  options: { write?: boolean; replaceSeededCard?: boolean } = {},
): Promise<PillarRebuildReport> {
  const write = options.write === true
  const replaceSeededCard = options.replaceSeededCard === true
  const { data, error } = await supabase
    .from('llm_system_cards')
    .select('id, model_identifier, source_markdown')
  if (error) throw new Error(error.message)

  const cards = (data ?? []) as PillarRebuildCardInput[]
  const seedCard = cards.find((card) => card.model_identifier === SEEDED_SYSTEM_CARD_IDENTIFIER)
  let existingSeedPillars: StoredPillarSnapshot[] = []
  if (seedCard?.id) {
    const existing = await supabase
      .from('llm_system_card_pillars')
      .select('pillar_code, pillar_title, sections_covered, summary, key_points, ai_act_compliance, recommendations')
      .eq('system_card_id', seedCard.id)
    if (existing.error) throw new Error(existing.error.message)
    existingSeedPillars = (existing.data ?? []) as StoredPillarSnapshot[]
  }

  const prepared = preparePillarRebuild(cards)
  const writtenIdentifiers: string[] = []
  if (write) {
    for (const card of prepared) {
      if (!card.pillars) continue
      if (card.input.model_identifier === SEEDED_SYSTEM_CARD_IDENTIFIER && !replaceSeededCard) continue
      const { error: upsertError } = await supabase
        .from('llm_system_card_pillars')
        .upsert(pillarRows(card.input.id, card.pillars), { onConflict: 'system_card_id,pillar_code' })
      if (upsertError) throw new Error(upsertError.message)
      writtenIdentifiers.push(card.input.model_identifier)
    }
  }

  return buildPillarRebuildReport({
    cards,
    existingSeedPillars,
    dryRun: !write,
    replaceSeededCard,
    writtenIdentifiers,
  })
}
