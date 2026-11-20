import {
  findControlTowerHeader,
  MissingControlTowerHeaderError,
} from '@/lib/bench-llm/control-tower-headers'

export type LineageModel = {
  id: string
  mergedIntoId?: string | null
  referenceModelId?: string | null
  slug?: string | null
  modelName?: string | null
}

export type AliasRecord = {
  modelId: string
  source: string
  sourceId: string
  normalizedName: string
  rawName?: string | null
}

export function followMergedModelId(
  startId: string,
  byId: ReadonlyMap<string, LineageModel>,
): string {
  const seen = new Set<string>()
  let current = startId
  while (!seen.has(current)) {
    seen.add(current)
    const next = byId.get(current)?.mergedIntoId
    if (!next || next === current) return current
    current = next
  }
  return current
}

export function resolveReferenceModelId(
  startId: string,
  byId: ReadonlyMap<string, LineageModel>,
): string {
  const absorbed = followMergedModelId(startId, byId)
  const reference = byId.get(absorbed)?.referenceModelId
  if (!reference || reference === absorbed) return absorbed
  return followMergedModelId(reference, byId)
}

export function matchAliasRecord(
  aliases: readonly AliasRecord[],
  params: { source: string; sourceId: string; normalizedName: string },
): AliasRecord | null {
  const byIdentity = aliases.find(
    (alias) => alias.source === params.source && alias.sourceId === params.sourceId,
  )
  if (byIdentity) return byIdentity
  const byName = aliases.filter((alias) => alias.normalizedName === params.normalizedName && alias.source === params.source)
  return byName.length === 1 ? byName[0]! : null
}

export function resolveAliasTargetId(
  aliases: ReadonlyArray<AliasRecord>,
  models: ReadonlyArray<LineageModel>,
  params: { source: string; sourceId: string; normalizedName: string },
): string | null {
  const alias = matchAliasRecord(aliases, params)
  if (!alias) return null
  const byId = new Map(models.map((model) => [model.id, model]))
  if (!byId.has(alias.modelId)) byId.set(alias.modelId, { id: alias.modelId })
  return followMergedModelId(alias.modelId, byId)
}

export type SearchableModel = {
  id: string
  modelName: string
  referenceModelId?: string | null
  mergedIntoId?: string | null
}

export function visibleModelsForQuery(params: {
  visible: ReadonlyArray<SearchableModel>
  variants: ReadonlyArray<SearchableModel>
  aliases: ReadonlyArray<{ modelId: string; names: ReadonlyArray<string> }>
  query: string
}): SearchableModel[] {
  const needle = params.query.trim().toLowerCase()
  if (!needle) return [...params.visible]
  const visibleById = new Map(params.visible.map((model) => [model.id, model]))
  const byId = new Map<string, LineageModel>()
  for (const model of [...params.visible, ...params.variants]) {
    byId.set(model.id, {
      id: model.id,
      mergedIntoId: model.mergedIntoId,
      referenceModelId: model.referenceModelId,
      modelName: model.modelName,
    })
  }
  const selected = new Map<string, SearchableModel>()
  const addResolved = (modelId: string) => {
    const resolved = resolveReferenceModelId(modelId, byId)
    const visible = visibleById.get(resolved)
    if (visible) selected.set(visible.id, visible)
  }
  const matches = (name: string) => name.toLowerCase().includes(needle)
  for (const model of params.visible) {
    if (matches(model.modelName)) addResolved(model.id)
  }
  for (const variant of params.variants) {
    if (matches(variant.modelName)) addResolved(variant.id)
  }
  for (const alias of params.aliases) {
    if (alias.names.some(matches)) addResolved(alias.modelId)
  }
  return [...selected.values()]
}

export function systemCardReferenceMention(
  selectedName: string | null | undefined,
  referenceName: string | null | undefined,
): string | null {
  const reference = referenceName?.trim()
  if (!reference || reference === selectedName?.trim()) return null
  return `Fiche de ${reference}`
}

export type UniqueRow = { id: string }

export function partitionUniqueMoves<T extends UniqueRow>(
  absorbedRows: ReadonlyArray<T>,
  absorberRows: ReadonlyArray<T>,
  keyOf: (row: T) => string,
): { updateIds: string[]; deleteIds: string[] } {
  const seen = new Set(absorberRows.map(keyOf))
  const updateIds: string[] = []
  const deleteIds: string[] = []
  for (const row of absorbedRows) {
    const key = keyOf(row)
    if (seen.has(key)) deleteIds.push(row.id)
    else {
      updateIds.push(row.id)
      seen.add(key)
    }
  }
  return { updateIds, deleteIds }
}

export function sheetDriveCellsToCopy(
  headers: readonly string[],
  absorbed: ReadonlyArray<string>,
  absorber: ReadonlyArray<string>,
): Array<{ header: string; value: string }> {
  const copies: Array<{ header: string; value: string }> = []
  for (const header of ['Lien du dossier Drive cible', 'Lien du fichier Markdown généré']) {
    const index = findControlTowerHeader(headers, header)
    if (index < 0) throw new MissingControlTowerHeaderError(header)
    const fromAbsorbed = absorbed[index]?.trim() ?? ''
    const alreadyThere = absorber[index]?.trim() ?? ''
    if (fromAbsorbed && !alreadyThere) copies.push({ header, value: fromAbsorbed })
  }
  return copies
}
