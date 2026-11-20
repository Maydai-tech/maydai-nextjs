export const CONTROL_TOWER_HEADER_GROUPS = {
  id: ['ID Supabase'],
  statutMaydai: ['Statut MaydAI'],
  provider: ['Nom de la technologie'],
  modelName: ['Nom du LLM (Standard Supabase)'],
  hermesName: ['Nom du LLM (Standard Hermes/Fichier)'],
  proposed: ["Proposé à l'utilisateur", 'Visible dans MaydAI'],
  usecases: ["Cas d'usage déclarés", 'Popularité'],
  lineType: ['Type de ligne'],
  precision: ['Précision'],
  legacyRole: ['Rôle'],
  reference: ['Ligne de référence (ID)'],
  merge: ['Fusionner avec (ID)'],
  baseModel: ['Modèle de base (ID)', 'Modèle de base'],
  taxonomyValidated: ['Taxonomie validée'],
  llmStatus: ['Statut LLM'],
  launchDate: ['Date de lancement'],
  deprecationDate: ['Date de dépréciation'],
  retirementDate: ['Date de retrait'],
  replacement: ['Remplacé par (ID)'],
  lifecycleSource: ['Source du statut'],
  lifecycleCheckedAt: ['Dernière vérification'],
  fiche: ['Statut Fiche Technique'],
  action: ['Action requise par Hermes'],
  priorityDate: ["Date de priorisation de l'action"],
  driveFolder: ['Lien du dossier Drive cible'],
  markdownFile: ['Lien du fichier Markdown généré'],
  humanAction: ['Action humaine requise'],
  legal: ['Validation juridique'],
  ready: ['Prêt pour import'],
  importResult: ["Résultat de l'import", 'Statut Supabase'],
  updatedAt: ['Date de dernière mise à jour (Supabase)'],
} as const

export type ControlTowerHeaderGroup = keyof typeof CONTROL_TOWER_HEADER_GROUPS

export const CONTROL_TOWER_CANONICAL_HEADERS = [
  'ID Supabase',
  'Statut MaydAI',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  "Proposé à l'utilisateur",
  "Cas d'usage déclarés",
  'Type de ligne',
  'Précision',
  'Ligne de référence (ID)',
  'Fusionner avec (ID)',
  'Modèle de base (ID)',
  'Taxonomie validée',
  'Statut LLM',
  'Date de lancement',
  'Date de dépréciation',
  'Date de retrait',
  'Remplacé par (ID)',
  'Source du statut',
  'Dernière vérification',
  'Statut Fiche Technique',
  'Action requise par Hermes',
  "Date de priorisation de l'action",
  'Lien du dossier Drive cible',
  'Lien du fichier Markdown généré',
  'Action humaine requise',
  'Validation juridique',
  'Prêt pour import',
  "Résultat de l'import",
  'Date de dernière mise à jour (Supabase)',
] as const

export const CONTROL_TOWER_CSV_HEADERS = [
  'ID Supabase',
  'Statut MaydAI',
  'Nom de la technologie',
  'Nom du LLM (Standard Supabase)',
  'Nom du LLM (Standard Hermes/Fichier)',
  "Proposé à l'utilisateur",
  "Cas d'usage déclarés",
  "Résultat de l'import",
  'Statut Fiche Technique',
  'Statut LLM',
  'Lien du dossier Drive cible',
  'Lien du fichier Markdown généré',
  'Date de dernière mise à jour (Supabase)',
  "Date de priorisation de l'action",
  'Action requise par Hermes',
  'Prêt pour import',
] as const

export class MissingControlTowerHeaderError extends Error {
  readonly header: string

  constructor(header: string, aliases: readonly string[] = []) {
    const alternatives = aliases.filter((alias) => foldControlTowerHeader(alias) !== foldControlTowerHeader(header))
    const suffix = alternatives.length > 0
      ? ` (ou ${alternatives.map((alias) => `« ${alias} »`).join(', ')})`
      : ''
    super(`En-tête manquant : « ${header} »${suffix}. Aucune colonne n'a été insérée.`)
    this.name = 'MissingControlTowerHeaderError'
    this.header = header
  }
}

export function foldControlTowerHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function columnIndexToA1(index: number): string {
  if (index < 0 || !Number.isInteger(index)) {
    throw new Error(`Index de colonne invalide: ${index}`)
  }
  let n = index + 1
  let label = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    label = String.fromCharCode(65 + rem) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`
}

export function findControlTowerHeader(headers: readonly string[], ...labels: string[]): number {
  const wanted = new Set(labels.map((label) => foldControlTowerHeader(label)))
  return headers.findIndex((header) => wanted.has(foldControlTowerHeader(header)))
}

export function requireControlTowerHeader(
  headers: readonly string[],
  canonical: string,
  ...aliases: string[]
): number {
  const index = findControlTowerHeader(headers, canonical, ...aliases)
  if (index < 0) throw new MissingControlTowerHeaderError(canonical, aliases)
  return index
}

export function requireControlTowerGroup(
  headers: readonly string[],
  group: ControlTowerHeaderGroup,
): number {
  const [canonical, ...aliases] = CONTROL_TOWER_HEADER_GROUPS[group]
  return requireControlTowerHeader(headers, canonical, ...aliases)
}

export function findControlTowerGroup(
  headers: readonly string[],
  group: ControlTowerHeaderGroup,
): number {
  const names = CONTROL_TOWER_HEADER_GROUPS[group]
  return findControlTowerHeader(headers, ...names)
}

export function columnLetterForGroup(
  headers: readonly string[],
  group: ControlTowerHeaderGroup,
): string {
  return columnIndexToA1(requireControlTowerGroup(headers, group))
}

export function sheetCell(row: readonly unknown[] | undefined, index: number): string {
  if (index < 0) return ''
  return String(row?.[index] ?? '').trim()
}
