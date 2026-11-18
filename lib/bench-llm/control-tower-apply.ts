export const CONTROL_TOWER_SHEET_WIDTH = 27

export const CONTROL_TOWER_COLUMNS = {
  id: 0,
  statutLlm: 6,
  baseModel: 14,
  role: 15,
  referenceModel: 16,
  mergedInto: 17,
  taxonomyValidated: 18,
  launchDate: 19,
  deprecationDate: 20,
  retirementDate: 21,
  replacementModel: 22,
  lifecycleSource: 23,
  lifecycleCheckedAt: 24,
} as const

export const CONTROL_TOWER_ROLES = [
  'base',
  'version',
  'non_documente',
  'stade',
  'format',
  'reglage',
  'auxiliaire',
  'alias',
  'introuvable',
  'a_classer',
] as const

const LIFECYCLE_BY_LABEL: Record<string, 'active' | 'legacy' | 'deprecated' | 'retired'> = {
  actif: 'active',
  active: 'active',
  legacy: 'legacy',
  deprecie: 'deprecated',
  deprecated: 'deprecated',
  retire: 'retired',
  retired: 'retired',
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ControlTowerModelRef = {
  id: string
  slug: string
  mergedIntoId: string | null
}

export type VeillePatch = {
  lifecycle_status?: 'active' | 'legacy' | 'deprecated' | 'retired' | null
  launch_date?: string | null
  deprecation_date?: string | null
  retirement_date?: string | null
  replacement_model_id?: string | null
  lifecycle_source_url: string
  lifecycle_checked_at?: string | null
}

export type TaxonomyPatch = {
  role: (typeof CONTROL_TOWER_ROLES)[number] | null
  reference_model_id: string | null
  merged_into_id: string | null
  base_model_id: string | null
}

export type ModifiedControlTowerRow = {
  sheetRow: number
  modelId: string
  veille: VeillePatch | null
  taxonomie: TaxonomyPatch | null
  sheetStatus: string | null
}

export type RejectedControlTowerValue = {
  sheetRow: number
  modelId: string
  column: string
  value: string
  reason: string
}

export type ControlTowerApplyPlan = {
  modifiedRows: ModifiedControlTowerRow[]
  rejectedValues: RejectedControlTowerValue[]
}

export function padControlTowerSheetRow(row: readonly unknown[] | undefined): string[] {
  return Array.from({ length: CONTROL_TOWER_SHEET_WIDTH }, (_, index) => String(row?.[index] ?? ''))
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function cell(row: string[], index: number): string {
  return (row[index] ?? '').trim()
}

export function parseControlTowerDate(value: string): string | null | 'invalid' {
  const text = value.trim()
  if (!text) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  if (!iso && !french) return 'invalid'
  const year = Number(iso?.[1] ?? french?.[3])
  const month = Number(iso?.[2] ?? french?.[2])
  const day = Number(iso?.[3] ?? french?.[1])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return 'invalid'
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseControlTowerTimestamp(value: string): string | null | 'invalid' {
  const text = value.trim()
  if (!text) return null
  const date = parseControlTowerDate(text)
  if (date === 'invalid') {
    const parsed = Date.parse(text)
    if (!Number.isFinite(parsed)) return 'invalid'
    return new Date(parsed).toISOString()
  }
  if (date == null) return null
  return `${date}T00:00:00.000Z`
}

function resolveModelId(
  value: string,
  byId: Map<string, ControlTowerModelRef>,
  bySlug: Map<string, ControlTowerModelRef>,
): string | null | 'invalid' {
  const text = value.trim()
  if (!text) return null
  if (UUID_PATTERN.test(text)) {
    return byId.has(text.toLowerCase()) ? byId.get(text.toLowerCase())!.id : 'invalid'
  }
  return bySlug.get(fold(text))?.id ?? 'invalid'
}

function mergeCycleMembers(next: Map<string, string | null>, starts: string[]): Set<string> {
  const members = new Set<string>()
  for (const start of starts) {
    const seen = new Map<string, number>()
    const stack: string[] = []
    let current: string | null = start
    while (current && !seen.has(current)) {
      seen.set(current, stack.length)
      stack.push(current)
      current = next.get(current) ?? null
    }
    if (current && seen.has(current)) {
      for (const id of stack.slice(seen.get(current))) members.add(id)
    }
  }
  return members
}

type TaxonomyDraft = {
  sheetRow: number
  modelId: string
  patch: TaxonomyPatch
  rejections: RejectedControlTowerValue[]
}

export function planControlTowerApply(input: {
  rows: Array<{ sheetRow: number; cells: readonly unknown[] }>
  models: ControlTowerModelRef[]
  today: string
}): ControlTowerApplyPlan {
  const byId = new Map(input.models.map((model) => [model.id.toLowerCase(), model]))
  const bySlug = new Map(input.models.map((model) => [fold(model.slug), model]))
  const modifiedRows: ModifiedControlTowerRow[] = []
  const rejectedValues: RejectedControlTowerValue[] = []
  const taxonomyDrafts: TaxonomyDraft[] = []

  for (const source of input.rows) {
    if (source.sheetRow <= 1) continue
    const row = padControlTowerSheetRow(source.cells)
    const rawId = cell(row, CONTROL_TOWER_COLUMNS.id)
    const sourceUrl = cell(row, CONTROL_TOWER_COLUMNS.lifecycleSource)
    const taxonomyMark = fold(cell(row, CONTROL_TOWER_COLUMNS.taxonomyValidated))
    const wantsVeille = sourceUrl.length > 0
    const wantsTaxonomy = taxonomyMark === 'oui'
    if (!wantsVeille && !wantsTaxonomy) continue

    const model = UUID_PATTERN.test(rawId) ? byId.get(rawId.toLowerCase()) : undefined
    if (!model) {
      rejectedValues.push({
        sheetRow: source.sheetRow,
        modelId: rawId,
        column: 'A',
        value: rawId,
        reason: 'ID inconnu',
      })
      continue
    }

    let veille: VeillePatch | null = null
    if (wantsVeille) {
      const rejections: RejectedControlTowerValue[] = []
      const statusText = cell(row, CONTROL_TOWER_COLUMNS.statutLlm)
      const status = statusText ? LIFECYCLE_BY_LABEL[fold(statusText)] : null
      if (statusText && !status) {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: 'G',
          value: statusText,
          reason: 'statut LLM inconnu',
        })
      }
      const launchDate = parseControlTowerDate(cell(row, CONTROL_TOWER_COLUMNS.launchDate))
      const deprecationDate = parseControlTowerDate(cell(row, CONTROL_TOWER_COLUMNS.deprecationDate))
      const retirementDate = parseControlTowerDate(cell(row, CONTROL_TOWER_COLUMNS.retirementDate))
      const checkedAt = parseControlTowerTimestamp(cell(row, CONTROL_TOWER_COLUMNS.lifecycleCheckedAt))
      for (const [column, parsed, value] of [
        ['T', launchDate, cell(row, CONTROL_TOWER_COLUMNS.launchDate)],
        ['U', deprecationDate, cell(row, CONTROL_TOWER_COLUMNS.deprecationDate)],
        ['V', retirementDate, cell(row, CONTROL_TOWER_COLUMNS.retirementDate)],
        ['Y', checkedAt, cell(row, CONTROL_TOWER_COLUMNS.lifecycleCheckedAt)],
      ] as const) {
        if (parsed === 'invalid') {
          rejections.push({
            sheetRow: source.sheetRow,
            modelId: model.id,
            column,
            value,
            reason: 'date invalide',
          })
        }
      }
      const replacement = resolveModelId(cell(row, CONTROL_TOWER_COLUMNS.replacementModel), byId, bySlug)
      if (replacement === 'invalid') {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: 'W',
          value: cell(row, CONTROL_TOWER_COLUMNS.replacementModel),
          reason: 'ID inconnu',
        })
      }
      rejectedValues.push(...rejections)
      const rejectedColumns = new Set(rejections.map((rejection) => rejection.column))
      veille = { lifecycle_source_url: sourceUrl }
      if (!rejectedColumns.has('G')) veille.lifecycle_status = status
      if (launchDate !== 'invalid') veille.launch_date = launchDate
      if (deprecationDate !== 'invalid') veille.deprecation_date = deprecationDate
      if (retirementDate !== 'invalid') veille.retirement_date = retirementDate
      if (replacement !== 'invalid') veille.replacement_model_id = replacement
      if (checkedAt !== 'invalid') veille.lifecycle_checked_at = checkedAt
    }

    if (wantsTaxonomy) {
      const rejections: RejectedControlTowerValue[] = []
      const roleText = cell(row, CONTROL_TOWER_COLUMNS.role)
      const role = roleText
        ? CONTROL_TOWER_ROLES.find((candidate) => candidate === fold(roleText).replace(/ /g, '_')) ?? null
        : null
      if (roleText && !role) {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: 'P',
          value: roleText,
          reason: 'rôle hors liste',
        })
      }
      const reference = resolveModelId(cell(row, CONTROL_TOWER_COLUMNS.referenceModel), byId, bySlug)
      const mergedInto = resolveModelId(cell(row, CONTROL_TOWER_COLUMNS.mergedInto), byId, bySlug)
      const baseModel = resolveModelId(cell(row, CONTROL_TOWER_COLUMNS.baseModel), byId, bySlug)
      for (const [column, resolved, value] of [
        ['Q', reference, cell(row, CONTROL_TOWER_COLUMNS.referenceModel)],
        ['R', mergedInto, cell(row, CONTROL_TOWER_COLUMNS.mergedInto)],
        ['O', baseModel, cell(row, CONTROL_TOWER_COLUMNS.baseModel)],
      ] as const) {
        if (resolved === 'invalid') {
          rejections.push({
            sheetRow: source.sheetRow,
            modelId: model.id,
            column,
            value,
            reason: 'ID inconnu',
          })
        }
      }
      rejectedValues.push(...rejections)
      if (rejections.length === 0) {
        taxonomyDrafts.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          rejections,
          patch: {
            role,
            reference_model_id: reference === 'invalid' ? null : reference,
            merged_into_id: mergedInto === 'invalid' ? null : mergedInto,
            base_model_id: baseModel === 'invalid' ? null : baseModel,
          },
        })
      }
    }

    if (veille) {
      modifiedRows.push({
        sheetRow: source.sheetRow,
        modelId: model.id,
        veille,
        taxonomie: null,
        sheetStatus: null,
      })
    }
  }

  const nextMerge = new Map(input.models.map((model) => [model.id, model.mergedIntoId]))
  for (const draft of taxonomyDrafts) nextMerge.set(draft.modelId, draft.patch.merged_into_id)
  const cyclicIds = mergeCycleMembers(nextMerge, taxonomyDrafts.map((draft) => draft.modelId))
  const acceptedTaxonomy = new Map<string, TaxonomyDraft>()
  for (const draft of taxonomyDrafts) {
    if (draft.patch.merged_into_id && cyclicIds.has(draft.modelId)) {
      rejectedValues.push({
        sheetRow: draft.sheetRow,
        modelId: draft.modelId,
        column: 'R',
        value: draft.patch.merged_into_id,
        reason: 'fusion circulaire',
      })
      continue
    }
    acceptedTaxonomy.set(draft.modelId, draft)
  }

  for (const draft of acceptedTaxonomy.values()) {
    const existing = modifiedRows.find((row) => row.modelId === draft.modelId && row.sheetRow === draft.sheetRow)
    const sheetStatus = `Appliquée le ${input.today}`
    if (existing) {
      existing.taxonomie = draft.patch
      existing.sheetStatus = sheetStatus
    } else {
      modifiedRows.push({
        sheetRow: draft.sheetRow,
        modelId: draft.modelId,
        veille: null,
        taxonomie: draft.patch,
        sheetStatus,
      })
    }
  }

  modifiedRows.sort((a, b) => a.sheetRow - b.sheetRow)
  return { modifiedRows, rejectedValues }
}
