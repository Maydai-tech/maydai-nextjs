import { z } from 'zod'

import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'
import { followMergedModelId, resolveAliasTargetId, type AliasRecord, type LineageModel } from '@/lib/bench-llm/model-lineage'

import type { ParsedCompariaModel } from '@/lib/comparia/import'

export const CompariaLinkStatusSchema = z.enum(['matched', 'unmatched', 'ignored'])
export type CompariaLinkStatus = z.infer<typeof CompariaLinkStatusSchema>

export const CompariaMatchMethodSchema = z.enum(['exact', 'slug', 'manual'])
export type CompariaMatchMethod = z.infer<typeof CompariaMatchMethodSchema>

/**
 * Ligne de rapprochement Compar:IA.
 * `superRefine` reprend `comparia_models_link_consistency` :
 * `matched` exige les deux clés, `unmatched` et `ignored` les exigent nulles.
 */
export const CompariaModelLinkStateSchema = z
  .object({
    id: z.string().uuid(),
    source_id: z.string(),
    link_status: CompariaLinkStatusSchema,
    maydai_model_id: z.string().uuid().nullable(),
    match_method: CompariaMatchMethodSchema.nullable(),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.link_status === 'matched') {
      if (row.maydai_model_id == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['maydai_model_id'],
          message: 'Un lien matched exige maydai_model_id.',
        })
      }
      if (row.match_method == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['match_method'],
          message: 'Un lien matched exige match_method.',
        })
      }
      return
    }

    if (row.maydai_model_id != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maydai_model_id'],
        message: 'Un lien unmatched ou ignored exige maydai_model_id null.',
      })
    }
    if (row.match_method != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['match_method'],
        message: 'Un lien unmatched ou ignored exige match_method null.',
      })
    }
  })

export type CompariaModelLinkState = z.infer<typeof CompariaModelLinkStateSchema>

export type CompariaHubModel = {
  id: string
  model_name: string
  model_provider: string | null
  slug: string | null
  merged_into_id?: string | null
}

export type CompariaExistingLink = {
  source_id: string
  maydai_model_id: string | null
  match_method: CompariaMatchMethod | null
  link_status?: CompariaLinkStatus | null
}

export type CompariaTechnicalId = {
  modelId: string
  sourceId: string
}

export type CompariaLinkDecision = {
  sourceId: string
  status: CompariaLinkStatus
  maydaiModelId: string | null
  matchMethod: CompariaMatchMethod | null
  origin: 'persistent' | 'automatic' | 'none'
}

export type CompariaIdMatchKeys = {
  exact: string[]
  normalized: string[]
}

/** Clés de rapprochement : id brut, puis id sans préfixe `fournisseur/`. */
export function compariaIdMatchKeys(sourceId: string): CompariaIdMatchKeys {
  const exact = new Set<string>()
  const lower = sourceId.trim().toLowerCase()
  if (lower) exact.add(lower)
  const slash = lower.lastIndexOf('/')
  if (slash >= 0 && slash < lower.length - 1) {
    const bare = lower.slice(slash + 1).trim()
    if (bare) exact.add(bare)
  }
  const normalized = new Set<string>()
  for (const key of exact) {
    const slug = normalizeLlmModelSlug(key)
    if (slug) normalized.add(slug)
  }
  return { exact: [...exact], normalized: [...normalized] }
}

function addKey(index: Map<string, Set<string>>, key: string | null | undefined, modelId: string) {
  if (!key) return
  const hits = index.get(key) ?? new Set<string>()
  hits.add(modelId)
  index.set(key, hits)
}

function uniqueHit(index: Map<string, Set<string>>, keys: readonly string[]): string | null {
  const ids = new Set<string>()
  let seen = false
  for (const key of keys) {
    const hits = index.get(key)
    if (!hits || hits.size === 0) continue
    seen = true
    for (const id of hits) ids.add(id)
  }
  if (!seen || ids.size !== 1) return null
  return [...ids][0] ?? null
}

function hasAnyHit(index: Map<string, Set<string>>, keys: readonly string[]): boolean {
  return keys.some((key) => (index.get(key)?.size ?? 0) > 0)
}

function persistentStatus(existing: CompariaExistingLink | undefined): CompariaLinkStatus | null {
  if (!existing) return null
  if (existing.link_status === 'ignored') return 'ignored'
  if (existing.link_status === 'matched' && existing.maydai_model_id && existing.match_method) return 'matched'
  if (existing.link_status === 'unmatched') return null
  if (existing.maydai_model_id && existing.match_method) return 'matched'
  return null
}

/**
 * Rapprochement déterministe.
 * 1. Lien persistant (`matched` / `ignored`) ou alias explicite.
 * 2. Égalité stricte (casse ignorée) sur le slug, l’id technique ou l’id sans préfixe `/`.
 * 3. Normalisation `.` / `-` uniquement si elle vise un seul modèle.
 * Aucun fuzzy matching : une ambiguïté reste `unmatched`.
 */
export function planCompariaLinks(params: {
  rows: readonly ParsedCompariaModel[]
  models: readonly CompariaHubModel[]
  technicalIds?: readonly CompariaTechnicalId[]
  existing?: readonly CompariaExistingLink[]
  aliases?: readonly AliasRecord[]
}): CompariaLinkDecision[] {
  const lineage = new Map<string, LineageModel>()
  for (const model of params.models) {
    lineage.set(model.id, { id: model.id, mergedIntoId: model.merged_into_id ?? null })
  }
  const canonical = (modelId: string) => followMergedModelId(modelId, lineage)

  const exactIndex = new Map<string, Set<string>>()
  const normalizedIndex = new Map<string, Set<string>>()
  for (const model of params.models) {
    const modelId = canonical(model.id)
    const slug = model.slug?.trim().toLowerCase()
    addKey(exactIndex, slug, modelId)
    addKey(normalizedIndex, normalizeLlmModelSlug(model.slug), modelId)
    addKey(normalizedIndex, normalizeLlmModelSlug(model.model_name), modelId)
    const technicalName = model.model_name.trim().toLowerCase()
    if (technicalName && !technicalName.includes(' ')) addKey(exactIndex, technicalName, modelId)
  }
  for (const technical of params.technicalIds ?? []) {
    const modelId = canonical(technical.modelId)
    const sourceId = technical.sourceId.trim().toLowerCase()
    addKey(exactIndex, sourceId, modelId)
    addKey(normalizedIndex, normalizeLlmModelSlug(technical.sourceId), modelId)
  }

  const existingBySource = new Map((params.existing ?? []).map((row) => [row.source_id, row]))
  const decisions: CompariaLinkDecision[] = params.rows.map((row) => {
    const existing = existingBySource.get(row.source_id)
    const stored = persistentStatus(existing)
    if (stored === 'ignored') {
      return {
        sourceId: row.source_id,
        status: 'ignored',
        maydaiModelId: null,
        matchMethod: null,
        origin: 'persistent',
      }
    }
    if (stored === 'matched' && existing?.maydai_model_id && existing.match_method) {
      return {
        sourceId: row.source_id,
        status: 'matched',
        maydaiModelId: canonical(existing.maydai_model_id),
        matchMethod: existing.match_method,
        origin: 'persistent',
      }
    }

    const aliasTarget = resolveAliasTargetId(params.aliases ?? [], [...lineage.values()], {
      source: 'comparia',
      sourceId: row.source_id,
      normalizedName: normalizeLlmModelSlug(row.source_id) ?? row.source_id.toLowerCase(),
    })
    if (aliasTarget) {
      return {
        sourceId: row.source_id,
        status: 'matched',
        maydaiModelId: aliasTarget,
        matchMethod: 'exact',
        origin: 'persistent',
      }
    }

    const keys = compariaIdMatchKeys(row.source_id)
    if (hasAnyHit(exactIndex, keys.exact)) {
      const exact = uniqueHit(exactIndex, keys.exact)
      if (!exact) {
        return { sourceId: row.source_id, status: 'unmatched', maydaiModelId: null, matchMethod: null, origin: 'none' }
      }
      return { sourceId: row.source_id, status: 'matched', maydaiModelId: exact, matchMethod: 'exact', origin: 'automatic' }
    }
    const normalized = uniqueHit(normalizedIndex, keys.normalized)
    if (!normalized) {
      return { sourceId: row.source_id, status: 'unmatched', maydaiModelId: null, matchMethod: null, origin: 'none' }
    }
    return { sourceId: row.source_id, status: 'matched', maydaiModelId: normalized, matchMethod: 'slug', origin: 'automatic' }
  })

  const indexesByModel = new Map<string, number[]>()
  decisions.forEach((decision, index) => {
    if (decision.status !== 'matched' || !decision.maydaiModelId) return
    const indexes = indexesByModel.get(decision.maydaiModelId) ?? []
    indexes.push(index)
    indexesByModel.set(decision.maydaiModelId, indexes)
  })
  for (const indexes of indexesByModel.values()) {
    if (indexes.length < 2) continue
    const persistent = indexes.filter((index) => decisions[index]?.origin === 'persistent')
    const manual = persistent.filter((index) => decisions[index]?.matchMethod === 'manual')
    const keeper = manual.length === 1 ? manual[0] : persistent.length > 0 ? persistent[0] : null
    for (const index of indexes) {
      if (keeper != null && index === keeper) continue
      decisions[index] = {
        sourceId: decisions[index]!.sourceId,
        status: 'unmatched',
        maydaiModelId: null,
        matchMethod: null,
        origin: 'none',
      }
    }
  }

  return decisions
}

export function summarizeCompariaLinks(decisions: readonly CompariaLinkDecision[]) {
  return {
    matchedCount: decisions.filter((decision) => decision.status === 'matched').length,
    ignoredCount: decisions.filter((decision) => decision.status === 'ignored').length,
    unmatchedCount: decisions.filter((decision) => decision.status === 'unmatched').length,
  }
}
