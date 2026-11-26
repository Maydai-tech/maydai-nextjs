import {
  findControlTowerGroup,
  foldControlTowerHeader,
  requireControlTowerGroup,
  sheetCell,
  type ControlTowerHeaderGroup,
} from '@/lib/bench-llm/control-tower-headers'
import {
  explainReferenceRefusal,
  lineKindFromRole,
  roleFromLegacyLabel,
  roleFromLineLabels,
  type LineKind,
} from '@/lib/bench-llm/control-tower-taxonomy'
import { type ControlTowerRole } from '@/lib/bench-llm/control-tower-roles'
import {
  blankLicenseText,
  licenseClassFromLabel,
  type LicenseClass,
} from '@/lib/bench-llm/license-class'
import { isModelProposedToUser } from '@/lib/bench-llm/model-visibility'

export type { ControlTowerRole }

const LIFECYCLE_BY_LABEL: Record<string, 'active' | 'legacy' | 'deprecated' | 'retired'> = {
  actif: 'active',
  active: 'active',
  legacy: 'legacy',
  deprecie: 'deprecated',
  deprecated: 'deprecated',
  retire: 'retired',
  retired: 'retired',
}

export type SheetLifecycleStatus = 'active' | 'legacy' | 'deprecated' | 'retired'

/** Actif, Legacy, Déprécié, Retiré. Vide → null. Libellé inconnu → invalid. */
export function lifecycleStatusFromSheetLabel(label: string): SheetLifecycleStatus | null | 'invalid' {
  const folded = fold(label)
  if (!folded) return null
  return LIFECYCLE_BY_LABEL[folded] ?? 'invalid'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ControlTowerModelRef = {
  id: string
  slug: string
  modelName: string
  mergedIntoId: string | null
  role: string | null
  referenceModelId: string | null
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
  role: ControlTowerRole | null
  reference_model_id: string | null
  merged_into_id: string | null
  base_model_id: string | null
}

export type LicensePatch = {
  license_class: LicenseClass
  license_id: string | null
  license_url: string | null
  license_eu_restricted: boolean
}

export type ModifiedControlTowerRow = {
  sheetRow: number
  modelId: string
  veille: VeillePatch | null
  taxonomie: TaxonomyPatch | null
  licence: LicensePatch | null
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

function fold(value: string): string {
  return foldControlTowerHeader(value)
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

function groupLabel(group: ControlTowerHeaderGroup): string {
  return requireGroupName(group)
}

function requireGroupName(group: ControlTowerHeaderGroup): string {
  const names = {
    id: 'ID Supabase',
    statutMaydai: 'Statut MaydAI',
    provider: 'Nom de la technologie',
    modelName: 'Nom du LLM (Standard Supabase)',
    hermesName: 'Nom du LLM (Standard Hermes/Fichier)',
    proposed: "Proposé à l'utilisateur",
    usecases: "Cas d'usage déclarés",
    lineType: 'Type de ligne',
    precision: 'Précision',
    legacyRole: 'Rôle',
    reference: 'Ligne de référence (ID)',
    merge: 'Fusionner avec (ID)',
    baseModel: 'Modèle de base (ID)',
    taxonomyValidated: 'Taxonomie validée',
    llmStatus: 'Statut LLM',
    launchDate: 'Date de lancement',
    deprecationDate: 'Date de dépréciation',
    retirementDate: 'Date de retrait',
    replacement: 'Remplacé par (ID)',
    lifecycleSource: 'Source du statut',
    lifecycleCheckedAt: 'Dernière vérification',
    fiche: 'Statut Fiche Technique',
    action: 'Action requise par Hermes',
    priorityDate: "Date de priorisation de l'action",
    driveFolder: 'Lien du dossier Drive cible',
    markdownFile: 'Lien du fichier Markdown généré',
    humanAction: 'Action humaine requise',
    legal: 'Validation juridique',
    ready: 'Prêt pour import',
    importResult: "Résultat de l'import",
    updatedAt: 'Date de dernière mise à jour (Supabase)',
    licenseClass: 'Type de modèle',
    licenseId: 'Identifiant de la licence',
    licenseUrl: 'Source de la licence',
    licenseEu: 'Exclusion UE',
  } as const
  return names[group]
}

function readGroup(
  headers: readonly string[],
  row: readonly unknown[],
  group: ControlTowerHeaderGroup,
): string {
  return sheetCell(row, requireControlTowerGroup(headers, group))
}

type TaxonomyDraft = {
  sheetRow: number
  modelId: string
  modelName: string
  patch: TaxonomyPatch
}

function readLicensePatch(
  headers: readonly string[],
  row: readonly unknown[],
  sheetRow: number,
  modelId: string,
): { patch: LicensePatch | null; rejections: RejectedControlTowerValue[] } {
  const label = readGroup(headers, row, 'licenseClass')
  const parsed = licenseClassFromLabel(label)
  if (parsed === 'empty') return { patch: null, rejections: [] }
  if (parsed === 'invalid') {
    return {
      patch: null,
      rejections: [{
        sheetRow,
        modelId,
        column: groupLabel('licenseClass'),
        value: label,
        reason: 'type de modèle inconnu',
      }],
    }
  }
  const exclusion = readGroup(headers, row, 'licenseEu')
  const foldedExclusion = fold(exclusion)
  if (exclusion && foldedExclusion !== 'oui') {
    return {
      patch: null,
      rejections: [{
        sheetRow,
        modelId,
        column: groupLabel('licenseEu'),
        value: exclusion,
        reason: 'exclusion UE inconnue',
      }],
    }
  }
  return {
    patch: {
      license_class: parsed,
      license_id: blankLicenseText(readGroup(headers, row, 'licenseId')),
      license_url: blankLicenseText(readGroup(headers, row, 'licenseUrl')),
      license_eu_restricted: foldedExclusion === 'oui',
    },
    rejections: [],
  }
}

function readTaxonomyRole(
  headers: readonly string[],
  row: readonly unknown[],
): { role: ControlTowerRole | null | 'invalid'; column: string; value: string; reason: string } {
  const typeIndex = findControlTowerGroup(headers, 'lineType')
  if (typeIndex >= 0) {
    const precisionIndex = requireControlTowerGroup(headers, 'precision')
    const typeValue = sheetCell(row, typeIndex)
    const precisionValue = sheetCell(row, precisionIndex)
    const role = roleFromLineLabels(typeValue, precisionValue)
    const typeKnown = ['modele', 'variante', 'doublon', 'hors champ'].includes(fold(typeValue))
    return {
      role,
      column: role === 'invalid' && typeKnown ? groupLabel('precision') : groupLabel('lineType'),
      value: [typeValue, precisionValue].filter(Boolean).join(' / '),
      reason: role === 'invalid' && typeKnown
        ? 'précision incompatible avec le type de ligne'
        : 'type de ligne hors liste',
    }
  }
  const legacyIndex = requireControlTowerGroup(headers, 'legacyRole')
  const value = sheetCell(row, legacyIndex)
  return {
    role: roleFromLegacyLabel(value),
    column: groupLabel('legacyRole'),
    value,
    reason: 'type de ligne hors liste',
  }
}

export function planControlTowerApply(input: {
  headers: readonly string[]
  rows: Array<{ sheetRow: number; cells: readonly unknown[] }>
  models: ControlTowerModelRef[]
  today: string
}): ControlTowerApplyPlan {
  const headers = input.headers
  requireControlTowerGroup(headers, 'id')
  requireControlTowerGroup(headers, 'llmStatus')
  requireControlTowerGroup(headers, 'baseModel')
  requireControlTowerGroup(headers, 'reference')
  requireControlTowerGroup(headers, 'merge')
  requireControlTowerGroup(headers, 'taxonomyValidated')
  requireControlTowerGroup(headers, 'launchDate')
  requireControlTowerGroup(headers, 'deprecationDate')
  requireControlTowerGroup(headers, 'retirementDate')
  requireControlTowerGroup(headers, 'replacement')
  requireControlTowerGroup(headers, 'lifecycleSource')
  requireControlTowerGroup(headers, 'lifecycleCheckedAt')
  if (findControlTowerGroup(headers, 'lineType') >= 0) {
    requireControlTowerGroup(headers, 'precision')
  } else {
    requireControlTowerGroup(headers, 'legacyRole')
  }

  const byId = new Map(input.models.map((model) => [model.id.toLowerCase(), model]))
  const bySlug = new Map(input.models.map((model) => [fold(model.slug), model]))
  const modifiedRows: ModifiedControlTowerRow[] = []
  const rejectedValues: RejectedControlTowerValue[] = []
  const taxonomyDrafts: TaxonomyDraft[] = []

  for (const source of input.rows) {
    if (source.sheetRow <= 1) continue
    const row = source.cells
    const rawId = readGroup(headers, row, 'id')
    const sourceUrl = readGroup(headers, row, 'lifecycleSource')
    const taxonomyMark = fold(readGroup(headers, row, 'taxonomyValidated'))
    const wantsVeille = sourceUrl.length > 0
    const wantsTaxonomy = taxonomyMark === 'oui'
    const wantsLicense = findControlTowerGroup(headers, 'licenseClass') >= 0
      && fold(readGroup(headers, row, 'statutMaydai')) === 'questionnaire'
    if (!wantsVeille && !wantsTaxonomy && !wantsLicense) continue

    const model = UUID_PATTERN.test(rawId) ? byId.get(rawId.toLowerCase()) : undefined
    if (!model) {
      rejectedValues.push({
        sheetRow: source.sheetRow,
        modelId: rawId,
        column: groupLabel('id'),
        value: rawId,
        reason: 'ID inconnu',
      })
      continue
    }

    let veille: VeillePatch | null = null
    if (wantsVeille) {
      const rejections: RejectedControlTowerValue[] = []
      const statusText = readGroup(headers, row, 'llmStatus')
      const status = lifecycleStatusFromSheetLabel(statusText)
      if (status === 'invalid') {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: groupLabel('llmStatus'),
          value: statusText,
          reason: 'statut LLM inconnu',
        })
      }
      const launchDate = parseControlTowerDate(readGroup(headers, row, 'launchDate'))
      const deprecationDate = parseControlTowerDate(readGroup(headers, row, 'deprecationDate'))
      const retirementDate = parseControlTowerDate(readGroup(headers, row, 'retirementDate'))
      const checkedAt = parseControlTowerTimestamp(readGroup(headers, row, 'lifecycleCheckedAt'))
      for (const [group, parsed, value] of [
        ['launchDate', launchDate, readGroup(headers, row, 'launchDate')],
        ['deprecationDate', deprecationDate, readGroup(headers, row, 'deprecationDate')],
        ['retirementDate', retirementDate, readGroup(headers, row, 'retirementDate')],
        ['lifecycleCheckedAt', checkedAt, readGroup(headers, row, 'lifecycleCheckedAt')],
      ] as const) {
        if (parsed === 'invalid') {
          rejections.push({
            sheetRow: source.sheetRow,
            modelId: model.id,
            column: groupLabel(group),
            value,
            reason: 'date invalide',
          })
        }
      }
      const replacement = resolveModelId(readGroup(headers, row, 'replacement'), byId, bySlug)
      if (replacement === 'invalid') {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: groupLabel('replacement'),
          value: readGroup(headers, row, 'replacement'),
          reason: 'ID inconnu',
        })
      }
      rejectedValues.push(...rejections)
      veille = { lifecycle_source_url: sourceUrl }
      if (status && status !== 'invalid') veille.lifecycle_status = status
      if (launchDate !== 'invalid') veille.launch_date = launchDate
      if (deprecationDate !== 'invalid') veille.deprecation_date = deprecationDate
      if (retirementDate !== 'invalid') veille.retirement_date = retirementDate
      if (replacement !== 'invalid') veille.replacement_model_id = replacement
      if (checkedAt !== 'invalid') veille.lifecycle_checked_at = checkedAt
    }

    if (wantsTaxonomy) {
      const rejections: RejectedControlTowerValue[] = []
      const parsedRole = readTaxonomyRole(headers, row)
      if (parsedRole.value && parsedRole.role === 'invalid') {
        rejections.push({
          sheetRow: source.sheetRow,
          modelId: model.id,
          column: parsedRole.column,
          value: parsedRole.value,
          reason: parsedRole.reason,
        })
      }
      const reference = resolveModelId(readGroup(headers, row, 'reference'), byId, bySlug)
      const mergedInto = resolveModelId(readGroup(headers, row, 'merge'), byId, bySlug)
      const baseModel = resolveModelId(readGroup(headers, row, 'baseModel'), byId, bySlug)
      for (const [group, resolved, value] of [
        ['reference', reference, readGroup(headers, row, 'reference')],
        ['merge', mergedInto, readGroup(headers, row, 'merge')],
        ['baseModel', baseModel, readGroup(headers, row, 'baseModel')],
      ] as const) {
        if (resolved === 'invalid') {
          rejections.push({
            sheetRow: source.sheetRow,
            modelId: model.id,
            column: groupLabel(group),
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
          modelName: model.modelName,
          patch: {
            role: parsedRole.role === 'invalid' ? null : parsedRole.role,
            reference_model_id: reference === 'invalid' ? null : reference,
            merged_into_id: mergedInto === 'invalid' ? null : mergedInto,
            base_model_id: baseModel === 'invalid' ? null : baseModel,
          },
        })
      }
    }

    let licence: LicensePatch | null = null
    if (wantsLicense) {
      const parsedLicense = readLicensePatch(headers, row, source.sheetRow, model.id)
      rejectedValues.push(...parsedLicense.rejections)
      licence = parsedLicense.patch
    }

    if (veille || licence) {
      modifiedRows.push({
        sheetRow: source.sheetRow,
        modelId: model.id,
        veille,
        taxonomie: null,
        licence,
        sheetStatus: null,
      })
    }
  }

  const nextMerge = new Map(input.models.map((model) => [model.id, model.mergedIntoId]))
  for (const draft of taxonomyDrafts) nextMerge.set(draft.modelId, draft.patch.merged_into_id)
  const cyclicIds = mergeCycleMembers(nextMerge, taxonomyDrafts.map((draft) => draft.modelId))

  const roleById = new Map(input.models.map((model) => [model.id, model.role]))
  for (const draft of taxonomyDrafts) roleById.set(draft.modelId, draft.patch.role)
  const names = new Map(input.models.map((model) => [model.id, model.modelName]))
  const references = new Map(input.models.map((model) => [model.id, model.referenceModelId]))
  for (const draft of taxonomyDrafts) references.set(draft.modelId, draft.patch.reference_model_id)
  const kinds = new Map<string, LineKind>(
    input.models.map((model) => [model.id, lineKindFromRole(roleById.get(model.id))]),
  )

  const acceptedTaxonomy = new Map<string, TaxonomyDraft>()
  for (const draft of taxonomyDrafts) {
    if (draft.patch.merged_into_id && cyclicIds.has(draft.modelId)) {
      rejectedValues.push({
        sheetRow: draft.sheetRow,
        modelId: draft.modelId,
        column: groupLabel('merge'),
        value: draft.patch.merged_into_id,
        reason: 'fusion circulaire',
      })
      continue
    }
    const referenceReason = explainReferenceRefusal({
      modelId: draft.modelId,
      modelName: draft.modelName,
      referenceId: draft.patch.reference_model_id,
      names,
      kinds,
      references,
    })
    if (referenceReason) {
      rejectedValues.push({
        sheetRow: draft.sheetRow,
        modelId: draft.modelId,
        column: groupLabel('reference'),
        value: draft.patch.reference_model_id ?? '',
        reason: referenceReason,
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
        licence: null,
        sheetStatus,
      })
    }
  }

  modifiedRows.sort((a, b) => a.sheetRow - b.sheetRow)
  return { modifiedRows, rejectedValues }
}

/** Objet envoyé à compl_ai_models. Le statut reconnu est toujours inclus. */
export function controlTowerDatabasePatch(row: ModifiedControlTowerRow): Record<string, unknown> {
  return {
    ...(row.veille ?? {}),
    ...(row.taxonomie ?? {}),
    ...(row.licence ?? {}),
  }
}

export type SelectorModelState = {
  id: string
  providerInQuestionnaire: boolean
  role: string | null
  lifecycleStatus: string | null
  mergedIntoId: string | null
  visibilityOverride: boolean | null
  licenseClass: string | null
}

export type SelectorProjection = {
  before: number
  after: number
  hidden: number
}

function visibilityOf(model: SelectorModelState) {
  return isModelProposedToUser({
    providerInQuestionnaire: model.providerInQuestionnaire,
    role: model.role,
    lifecycleStatus: model.lifecycleStatus,
    mergedIntoId: model.mergedIntoId,
    visibilityOverride: model.visibilityOverride,
    licenseClass: model.licenseClass,
  })
}

/** Applique le même patch que l’écriture, puis recalcule le sélecteur. */
export function projectSelectorAfterApply(
  models: SelectorModelState[],
  rows: ModifiedControlTowerRow[],
): SelectorProjection {
  const nextById = new Map(models.map((model) => [model.id, { ...model }]))
  for (const row of rows) {
    const model = nextById.get(row.modelId)
    if (!model) continue
    const patch = controlTowerDatabasePatch(row)
    if (Object.prototype.hasOwnProperty.call(patch, 'lifecycle_status')) {
      model.lifecycleStatus = (patch.lifecycle_status as string | null) ?? null
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'role')) {
      model.role = (patch.role as string | null) ?? null
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'merged_into_id')) {
      model.mergedIntoId = (patch.merged_into_id as string | null) ?? null
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'license_class')) {
      model.licenseClass = String(patch.license_class)
    }
  }
  const next = [...nextById.values()]
  const before = models.filter((model) => visibilityOf(model)).length
  const after = next.filter((model) => visibilityOf(model)).length
  const hidden = models.filter((model) => {
    const projected = nextById.get(model.id) ?? model
    return visibilityOf(model) && !visibilityOf(projected)
  }).length
  return { before, after, hidden }
}
