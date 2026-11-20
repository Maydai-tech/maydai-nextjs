import { foldControlTowerHeader } from '@/lib/bench-llm/control-tower-headers'
import {
  explainReferenceRefusal,
  lineKindFromRole,
  type LineKind,
} from '@/lib/bench-llm/control-tower-taxonomy'

export type PreclassModel = {
  id: string
  provider: string
  modelName: string
  createdAt: string
  hasCard: boolean
  usecases: number
}

export type PreclassLineType = '' | 'Modèle' | 'Variante' | 'Doublon' | 'Hors champ'

export type PreclassPrecision =
  | ''
  | 'Stade'
  | 'Réglage'
  | 'Format'
  | 'Instantané'
  | 'Auxiliaire'

export type PreclassProposal = {
  id: string
  provider: string
  modelName: string
  lineType: PreclassLineType
  precision: PreclassPrecision
  referenceId: string | null
  mergeId: string | null
  action: '' | 'CLASSER'
  family: string
}

type VariantKind = 'plain' | 'stade' | 'reglage' | 'format' | 'instantane' | 'auxiliaire'

type AnalyzedModel = PreclassModel & {
  tokens: string[]
  exact: string
  family: string
  kind: VariantKind
}

const PROVIDER_PREFIXES: Record<string, string[]> = {
  openai: ['openai', 'chatgpt'],
  mistral: ['mistral'],
  qwen: ['qwen', 'alibaba'],
  google: ['google', 'gemini', 'gemma'],
  deepseek: ['deepseek'],
  anthropic: ['anthropic', 'claude'],
  meta: ['meta', 'llama'],
  xai: ['xai', 'grok'],
  microsoft: ['microsoft', 'phi'],
  perplexity: ['perplexity', 'sonar'],
}

const STADE = new Set(['base', 'instruct', 'reasoning', 'preview'])
const REGLAGE = new Set(['high', 'thinking'])
const FORMAT = new Set(['fp8', 'nvfp4', 'awq', 'gguf'])

const PRECISION_BY_KIND: Record<Exclude<VariantKind, 'plain'>, PreclassPrecision> = {
  stade: 'Stade',
  reglage: 'Réglage',
  format: 'Format',
  instantane: 'Instantané',
  auxiliaire: 'Auxiliaire',
}

function wordsOf(value: string): string[] {
  return foldControlTowerHeader(value).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
}

function isSize(token: string): boolean {
  return /^\d+(?:x\d+)?b$/.test(token)
}

function isShortDate(token: string): boolean {
  return /^\d{4}$/.test(token)
}

function isSnapshot(token: string): boolean {
  return /^(?:19|20)\d{6}$/.test(token)
}

function tokensOf(name: string, provider: string): string[] {
  let words = wordsOf(name)
  const prefixes = [foldControlTowerHeader(provider), ...(PROVIDER_PREFIXES[foldControlTowerHeader(provider)] ?? [])]
  let changed = true
  while (changed && words.length > 0) {
    changed = false
    for (const prefix of prefixes) {
      const parts = wordsOf(prefix)
      if (parts.length > 0 && words.slice(0, parts.length).join(' ') === parts.join(' ')) {
        words = words.slice(parts.length)
        changed = true
      }
    }
  }
  return words
}

function analyze(model: PreclassModel): AnalyzedModel {
  const tokens = tokensOf(model.modelName, model.provider)
  const drop = new Set<number>()
  let kind: VariantKind = 'plain'
  const provider = foldControlTowerHeader(model.provider)
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] ?? ''
    if (isSize(token)) continue
    if (isShortDate(token)) {
      drop.add(index)
      continue
    }
    if ((token === 'reasoning' || token === 'thinking') && tokens[index - 1] === 'non') break
    if (isSnapshot(token)) {
      if (kind === 'plain') kind = 'instantane'
      drop.add(index)
      continue
    }
    if (token === 'medium' && provider === 'openai') {
      if (kind === 'plain') kind = 'reglage'
      drop.add(index)
      continue
    }
    if (STADE.has(token)) {
      if (kind === 'plain') kind = 'stade'
      drop.add(index)
      continue
    }
    if (REGLAGE.has(token)) {
      if (kind === 'plain') kind = 'reglage'
      drop.add(index)
      continue
    }
    if (FORMAT.has(token)) {
      if (kind === 'plain') kind = 'format'
      drop.add(index)
      continue
    }
    if (token === 'eagle') {
      if (kind === 'plain') kind = 'auxiliaire'
      drop.add(index)
      continue
    }
    break
  }
  return {
    ...model,
    tokens,
    exact: tokens.join(' '),
    family: tokens.filter((_, index) => !drop.has(index)).join(' '),
    kind,
  }
}

function byAge(left: AnalyzedModel, right: AnalyzedModel): number {
  const created = left.createdAt.localeCompare(right.createdAt)
  if (created !== 0) return created
  return left.id.localeCompare(right.id)
}

function pickKept(models: AnalyzedModel[]): AnalyzedModel {
  const withCard = models.filter((model) => model.hasCard).sort(byAge)
  if (withCard[0]) return withCard[0]
  const used = models.filter((model) => model.usecases > 0).sort(byAge)
  if (used[0]) return used[0]
  return [...models].sort(byAge)[0]!
}

function blank(model: AnalyzedModel): PreclassProposal {
  return {
    id: model.id,
    provider: model.provider,
    modelName: model.modelName,
    lineType: '',
    precision: '',
    referenceId: null,
    mergeId: null,
    action: 'CLASSER',
    family: model.family,
  }
}

export function preclassifyModels(models: PreclassModel[]): PreclassProposal[] {
  const analyzed = models.map(analyze)
  const byExact = new Map<string, AnalyzedModel[]>()
  for (const model of analyzed) {
    const key = `${foldControlTowerHeader(model.provider)}|${model.exact}`
    const group = byExact.get(key) ?? []
    group.push(model)
    byExact.set(key, group)
  }

  const mergeTarget = new Map<string, string>()
  for (const group of byExact.values()) {
    if (group.length < 2) continue
    const kept = pickKept(group)
    for (const model of group) {
      if (model.id !== kept.id) mergeTarget.set(model.id, kept.id)
    }
  }

  const byFamily = new Map<string, AnalyzedModel[]>()
  for (const model of analyzed) {
    if (mergeTarget.has(model.id)) continue
    const key = `${foldControlTowerHeader(model.provider)}|${model.family}`
    const group = byFamily.get(key) ?? []
    group.push(model)
    byFamily.set(key, group)
  }

  const familyModelId = new Map<string, string>()
  for (const [key, group] of byFamily) {
    const plain = group.filter((model) => model.kind === 'plain')
    const instruct = group.filter((model) => model.kind === 'stade' && model.tokens.includes('instruct'))
    const pool = plain.length > 0 ? plain : instruct
    if (pool.length === 0) continue
    familyModelId.set(key, pickKept(pool).id)
  }

  return analyzed.map((model) => {
    const familyKey = `${foldControlTowerHeader(model.provider)}|${model.family}`
    const mergeId = mergeTarget.get(model.id) ?? null
    if (mergeId) {
      return {
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        lineType: 'Doublon',
        precision: '',
        referenceId: null,
        mergeId,
        action: '',
        family: model.family,
      }
    }
    const modeleId = familyModelId.get(familyKey) ?? null
    if (model.kind === 'auxiliaire') {
      return {
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        lineType: 'Hors champ',
        precision: 'Auxiliaire',
        referenceId: null,
        mergeId: null,
        action: '',
        family: model.family,
      }
    }
    if (modeleId === model.id && (model.kind === 'plain' || model.tokens.includes('instruct'))) {
      return {
        id: model.id,
        provider: model.provider,
        modelName: model.modelName,
        lineType: 'Modèle',
        precision: '',
        referenceId: null,
        mergeId: null,
        action: '',
        family: model.family,
      }
    }
    if (model.kind === 'plain' || !modeleId) return blank(model)
    return {
      id: model.id,
      provider: model.provider,
      modelName: model.modelName,
      lineType: 'Variante',
      precision: PRECISION_BY_KIND[model.kind],
      referenceId: modeleId,
      mergeId: null,
      action: '',
      family: model.family,
    }
  })
}

export function preclassReferenceRefusals(proposals: PreclassProposal[]): Array<{
  id: string
  modelName: string
  referenceId: string
  reason: string
}> {
  const names = new Map(proposals.map((proposal) => [proposal.id, proposal.modelName]))
  const kinds = new Map(proposals.map((proposal) => [proposal.id, kindOfProposal(proposal)]))
  const references = new Map(proposals.map((proposal) => [proposal.id, proposal.referenceId]))
  const refusals = []
  for (const proposal of proposals) {
    if (!proposal.referenceId) continue
    const reason = explainReferenceRefusal({
      modelId: proposal.id,
      modelName: proposal.modelName,
      referenceId: proposal.referenceId,
      names,
      kinds,
      references,
    })
    if (reason) {
      refusals.push({
        id: proposal.id,
        modelName: proposal.modelName,
        referenceId: proposal.referenceId,
        reason,
      })
    }
  }
  return refusals
}

function kindOfProposal(proposal: PreclassProposal): LineKind {
  if (proposal.lineType === 'Modèle') return 'modele'
  if (proposal.lineType === 'Variante') return 'variante'
  if (proposal.lineType === 'Doublon') return 'doublon'
  if (proposal.lineType === 'Hors champ') return 'hors_champ'
  return 'inconnu'
}

export { lineKindFromRole }
