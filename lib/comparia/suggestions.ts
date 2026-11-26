import { normalizeLlmModelSlug } from '@/lib/bench-llm/model-slug'

export type CompariaSuggestionRow = {
  source_id: string
  organisation?: string | null
}

export type MaydaiSuggestionModel = {
  id: string
  slug?: string | null
  model_name: string
  model_provider?: string | null
  short_name?: string | null
  long_name?: string | null
  variants?: readonly string[] | null
  merged_into_id?: string | null
}

const TRAILING_NOISE = new Set(['preview', 'it', 'instruct', 'chat', 'latest', 'next', 'plus'])

const PROVIDER_ALIASES: Record<string, string> = {
  'mistral-ai': 'mistral',
  nous: 'nous-research',
  liquid: 'liquid-ai',
  moonshot: 'moonshot-ai',
  nvidia: 'nvidia',
}

function tokenize(value: string | null | undefined): string[] {
  const slug = normalizeLlmModelSlug(value ?? '')
  if (!slug) return []
  return slug.split('-').filter(Boolean)
}

function signature(tokens: readonly string[]): string {
  return [...tokens].sort().join('\u0000')
}

function isYear(token: string): boolean {
  return /^(19|20)\d{2}$/.test(token)
}

function isMonth(token: string): boolean {
  return /^\d{1,2}$/.test(token) && Number(token) >= 1 && Number(token) <= 12
}

function isDay(token: string): boolean {
  return /^\d{1,2}$/.test(token) && Number(token) >= 1 && Number(token) <= 31
}

/** Tampon de date en fin d'identifiant : YYMM (`2506`) ou MMDD (`0813`). */
function isDateStamp(token: string): boolean {
  if (!/^\d{4}$/.test(token)) return false
  const head = Number(token.slice(0, 2))
  const tail = Number(token.slice(2))
  const monthDay = head >= 1 && head <= 12 && tail >= 1 && tail <= 31
  const yearMonth = head >= 20 && head <= 39 && tail >= 1 && tail <= 12
  return monthDay || yearMonth
}

function isSizeToken(token: string): boolean {
  return /^\d+b$/.test(token) || /^a\d+b$/.test(token)
}

function stripNoise(tokens: readonly string[]): string[] {
  const out = tokens.filter((token) => !TRAILING_NOISE.has(token))
  let changed = true
  while (changed && out.length > 1) {
    changed = false
    const last = out[out.length - 1] ?? ''
    if (isDateStamp(last)) {
      out.pop()
      changed = true
      continue
    }
    if (last === '0' && /^\d+$/.test(out[out.length - 2] ?? '')) {
      out.pop()
      changed = true
      continue
    }
    if (
      out.length >= 3
      && isYear(out[out.length - 3] ?? '')
      && isMonth(out[out.length - 2] ?? '')
      && isDay(out[out.length - 1] ?? '')
    ) {
      out.splice(out.length - 3, 3)
      changed = true
    }
  }
  return out.length > 0 ? out : [...tokens]
}

function stripTrailingSizes(tokens: readonly string[]): string[] {
  const out = [...tokens]
  while (out.length > 1 && isSizeToken(out[out.length - 1] ?? '')) out.pop()
  return out
}

function providerKey(value: string | null | undefined): string | null {
  const slug = normalizeLlmModelSlug(value ?? '')
  if (!slug) return null
  return PROVIDER_ALIASES[slug] ?? slug
}

function providersCompatible(organisation: string | null | undefined, provider: string | null | undefined): boolean {
  const left = providerKey(organisation)
  const right = providerKey(provider)
  if (!left || !right) return true
  return left === right
}

function sameTokens(left: readonly string[], right: readonly string[]): boolean {
  return signature(left) === signature(right)
}

/** Le modèle ajoute un seul numéro de génération (`llama-maverick` → `llama-4-maverick`). */
function isSingleNewVersion(comparia: readonly string[], model: readonly string[]): boolean {
  if (comparia.some((token) => /^\d+$/.test(token))) return false
  if (model.length !== comparia.length + 1) return false
  const pool = [...comparia]
  const extra: string[] = []
  for (const token of model) {
    const index = pool.indexOf(token)
    if (index >= 0) pool.splice(index, 1)
    else extra.push(token)
  }
  return pool.length === 0 && extra.length === 1 && /^\d+$/.test(extra[0] ?? '')
}

function scoreAlias(
  compariaTokens: readonly string[],
  rawTokens: readonly string[],
  kind: 'primary' | 'alias',
): number {
  const stripped = stripNoise(rawTokens)
  const removed = rawTokens.length - stripped.length
  if (sameTokens(stripped, compariaTokens)) {
    if (kind === 'primary') return removed === 0 ? 100 : 92
    return removed === 0 ? 88 : 84
  }
  const withoutSize = stripTrailingSizes(stripped)
  if (kind === 'primary' && withoutSize.length < stripped.length && sameTokens(withoutSize, compariaTokens)) {
    return 80
  }
  if (kind === 'primary' && isSingleNewVersion(compariaTokens, stripped)) return 70
  return 0
}

function scoreModel(compariaTokens: readonly string[], model: MaydaiSuggestionModel): number {
  if (model.merged_into_id) return 0
  const providerTokens = new Set(tokenize(model.model_provider))
  const fields: Array<{ value: string | null | undefined; kind: 'primary' | 'alias' }> = [
    { value: model.slug, kind: 'primary' },
    { value: model.model_name, kind: 'primary' },
    { value: model.short_name, kind: 'primary' },
    { value: model.long_name, kind: 'alias' },
    ...(model.variants ?? []).map((variant) => ({ value: variant, kind: 'alias' as const })),
  ]
  let best = 0
  for (const field of fields) {
    if (!field.value) continue
    let tokens = tokenize(field.value)
    if (field.kind === 'alias') tokens = tokens.filter((token) => !providerTokens.has(token))
    best = Math.max(best, scoreAlias(compariaTokens, tokens, field.kind))
  }
  return best
}

/**
 * Meilleur candidat MaydAI pour une ligne encore `unmatched`.
 * Ne écrit rien : un score partagé par deux fiches ne pré-remplit pas le sélecteur.
 */
export function suggestMaydaiModelForComparia(
  compariaRow: CompariaSuggestionRow,
  allMaydaiModels: readonly MaydaiSuggestionModel[],
): MaydaiSuggestionModel | null {
  const compariaTokens = stripNoise(tokenize(compariaRow.source_id.includes('/')
    ? compariaRow.source_id.slice(compariaRow.source_id.lastIndexOf('/') + 1)
    : compariaRow.source_id))
  if (compariaTokens.length === 0) return null

  const ranked = allMaydaiModels
    .filter((model) => providersCompatible(compariaRow.organisation, model.model_provider))
    .map((model) => ({ model, score: scoreModel(compariaTokens, model) }))
    .filter((entry) => entry.score >= 70)
    .sort((left, right) => right.score - left.score || left.model.model_name.localeCompare(right.model.model_name, 'fr'))

  const best = ranked[0]
  if (!best) return null
  if (ranked.some((entry, index) => index > 0 && entry.score === best.score)) return null
  return best.model
}
