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

export type ControlTowerRole = (typeof CONTROL_TOWER_ROLES)[number]
