import type { EvaluationNodes } from '@/lib/mistral/evaluation-tool'

/** Catalogue réel : « Aucun de ces domaines » = `E4.N7.Q2.G` (pas de `Q2.H`). */
export const ANNEX_NONE_OPTION_CODE = 'E4.N7.Q2.G' as const

const ANNEX_KEYWORD_MAP: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\baucun\b|\bnone\b|\bn\/a\b/, code: ANNEX_NONE_OPTION_CODE },
  {
    pattern:
      /\bemploi\b|\brh\b|\brecrut|\bcandidat|\blicenci|\bembauche|\bgestion des travailleurs/,
    code: 'E4.N7.Q2.A',
  },
  { pattern: /\bjustice\b|\bdémocrat|\bdemocrat/, code: 'E4.N7.Q2.B' },
  { pattern: /\bmigration\b|\basile\b|\bfrontière|\bfrontiere/, code: 'E4.N7.Q2.C' },
  {
    pattern: /\binfrastructure|\bcritique\b|\bélectricité|\belectricite|\bénergie|\benergie/,
    code: 'E4.N7.Q2.D',
  },
  { pattern: /\béducation|\beducation|\bformation\b|\bscolaire/, code: 'E4.N7.Q2.E' },
  { pattern: /\brépressiv|\brepressiv|\bpolice\b|\bpénal|\bpenal/, code: 'E4.N7.Q2.F' },
]

function normalizeDomain(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function mapAnnexe3ToOptionCode(raw: string): string | null {
  const normalized = normalizeDomain(raw)
  if (!normalized) return null
  for (const entry of ANNEX_KEYWORD_MAP) {
    if (entry.pattern.test(normalized)) return entry.code
  }
  return null
}

/**
 * Traduit les nœuds Mistral en réponses catalogue (Q1, Art. 5, Annexe III).
 * Les champs non tranchés sont omis pour que le graphe les redemande.
 */
export function mapEvaluationNodesToAnswers(
  nodes: EvaluationNodes
): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {}

  if (nodes.role_deduit === 'fournisseur') {
    answers['E4.N7.Q1'] = 'E4.N7.Q1.A'
    answers['E4.N7.Q1.1'] = 'E4.N7.Q1.1.E'
  } else if (nodes.role_deduit === 'deployeur') {
    answers['E4.N7.Q1'] = 'E4.N7.Q1.B'
    // Q1.2 (Persona) volontairement omis : le graphe V3 la pose ensuite.
  }

  if (nodes.is_art5_interdit === false) {
    answers['E4.N7.Q3'] = ['E4.N7.Q3.E']
    answers['E4.N7.Q3.1'] = ['E4.N7.Q3.1.E']
    answers['E4.N7.Q2.1'] = ['E4.N7.Q2.1.E']
  }

  const annexCode = mapAnnexe3ToOptionCode(nodes.domaine_annexe3)
  if (annexCode) {
    answers['E4.N7.Q2'] = [annexCode]
  }

  return answers
}

const ACCESS_CONTROL_PATTERN =
  /\bsas\b|\bbadge\b|ouverture de porte|controle d['’ ]?acces|contrôle d['’ ]?accès|porte d['’ ]?entree|porte d['’ ]?entrée|porte entree|acces (au )?batiment|accès (au )?bâtiment/i
const EMPLOYMENT_DECISION_PATTERN =
  /\brecrut|\bcandidat|\bcv\b|\bcurriculum|\blicenci|\bembauche|\bpromotion\b|\bperformance|\bgestion des travailleurs|\bfiltrer les candidatures/i

function normalizeProjectText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Contrôle d’accès (badge, sas, porte) ≠ Annexe III Emploi (décisions RH). */
export function looksLikePhysicalAccessControl(projectText: string): boolean {
  const text = normalizeProjectText(projectText)
  if (!text.trim()) return false
  return ACCESS_CONTROL_PATTERN.test(text) && !EMPLOYMENT_DECISION_PATTERN.test(text)
}

export function withAnnexIiiAccessControlGuard(
  answers: Record<string, string | string[]>,
  projectText: string
): Record<string, string | string[]> {
  if (!looksLikePhysicalAccessControl(projectText)) return answers
  const q2 = answers['E4.N7.Q2']
  const onlyEmployment =
    Array.isArray(q2) && q2.length === 1 && q2[0] === 'E4.N7.Q2.A'
  if (!onlyEmployment) return answers
  const next = { ...answers, 'E4.N7.Q2': [ANNEX_NONE_OPTION_CODE] }
  delete next['E4.N7.Q5']
  return next
}
