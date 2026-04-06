/**
 * Calcul déterministe des statuts OUI / NON / Information insuffisante
 * pour les 9 slots du rapport AI Act.
 *
 * Ce module remplace la logique auparavant déléguée au LLM :
 * le code décide du statut, le LLM ne rédige que le texte explicatif.
 */

export type SlotStatus = 'OUI' | 'NON' | 'Information insuffisante'

export interface SlotStatusMap {
  quick_win_1: SlotStatus
  quick_win_2: SlotStatus
  quick_win_3: SlotStatus
  priorite_1: SlotStatus
  priorite_2: SlotStatus
  priorite_3: SlotStatus
  action_1: SlotStatus
  action_2: SlotStatus
  action_3: SlotStatus
}

export const SLOT_KEYS = [
  'quick_win_1', 'quick_win_2', 'quick_win_3',
  'priorite_1', 'priorite_2', 'priorite_3',
  'action_1', 'action_2', 'action_3',
] as const

export type SlotKey = typeof SLOT_KEYS[number]

// ─── Types d'entrée (alignés sur usecase_responses) ─────────────────────────

interface ResponseInput {
  question_code: string
  single_value?: string | null
  conditional_main?: string | null
  conditional_keys?: string[] | null
  conditional_values?: string[] | null
}

// ─── Codes d'options Oui / Non par question ─────────────────────────────────

const OUI_CODES: Record<string, string> = {
  'E5.N9.Q7':  'E5.N9.Q7.B',
  'E5.N9.Q8':  'E5.N9.Q8.B',
  'E5.N9.Q3':  'E5.N9.Q3.A',
  'E5.N9.Q4':  'E5.N9.Q4.A',
  'E5.N9.Q6':  'E5.N9.Q6.B',
  'E5.N9.Q1':  'E5.N9.Q1.A',
  'E5.N9.Q9':  'E5.N9.Q9.B',
  'E4.N8.Q12': 'E4.N8.Q12.A',
  'E6.N10.Q1': 'E6.N10.Q1.A',
  'E6.N10.Q2': 'E6.N10.Q2.A',
}

const NON_CODES: Record<string, string> = {
  'E5.N9.Q7':  'E5.N9.Q7.A',
  'E5.N9.Q8':  'E5.N9.Q8.A',
  'E5.N9.Q3':  'E5.N9.Q3.B',
  'E5.N9.Q4':  'E5.N9.Q4.B',
  'E5.N9.Q6':  'E5.N9.Q6.A',
  'E5.N9.Q1':  'E5.N9.Q1.B',
  'E5.N9.Q9':  'E5.N9.Q9.A',
  'E4.N8.Q12': 'E4.N8.Q12.B',
  'E6.N10.Q1': 'E6.N10.Q1.B',
  'E6.N10.Q2': 'E6.N10.Q2.B',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMainAnswer(response: ResponseInput | undefined): string | null {
  if (!response) return null
  return response.single_value || response.conditional_main || null
}

function buildConditionalData(response: ResponseInput): Record<string, string> {
  const data: Record<string, string> = {}
  if (!response.conditional_keys || !response.conditional_values) return data
  response.conditional_keys.forEach((key, i) => {
    const val = response.conditional_values?.[i] || ''
    if (val.trim()) data[key] = val.trim()
  })
  return data
}

function isNonEmpty(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function isOui(questionCode: string, answerCode: string | null): boolean {
  if (!answerCode) return false
  return answerCode === OUI_CODES[questionCode]
}

function isNon(questionCode: string, answerCode: string | null): boolean {
  if (!answerCode) return false
  return answerCode === NON_CODES[questionCode]
}

// ─── Calcul par slot ────────────────────────────────────────────────────────

function computeQuickWin1(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const r = responsesMap.get('E5.N9.Q7')
  const main = getMainAnswer(r)
  if (isNon('E5.N9.Q7', main)) return 'NON'
  if (isOui('E5.N9.Q7', main) && r) {
    const cd = buildConditionalData(r)
    if (isNonEmpty(cd.registry_type) || isNonEmpty(cd.system_name)) return 'OUI'
  }
  return 'Information insuffisante'
}

function computeQuickWin2(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const r = responsesMap.get('E5.N9.Q8')
  const main = getMainAnswer(r)
  if (isNon('E5.N9.Q8', main)) return 'NON'
  if (isOui('E5.N9.Q8', main) && r) {
    const cd = buildConditionalData(r)
    const nameOk =
      isNonEmpty(cd.supervisor_name) ||
      isNonEmpty(cd.supervisorName)
    const roleOk =
      isNonEmpty(cd.supervisor_role) ||
      isNonEmpty(cd.supervisorRole)
    if (nameOk && roleOk) return 'OUI'
  }
  return 'Information insuffisante'
}

function computeQuickWin3(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const main = getMainAnswer(responsesMap.get('E5.N9.Q3'))
  if (isOui('E5.N9.Q3', main)) return 'OUI'
  if (isNon('E5.N9.Q3', main)) return 'NON'
  return 'Information insuffisante'
}

function computePriorite1(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const main = getMainAnswer(responsesMap.get('E5.N9.Q4'))
  if (isOui('E5.N9.Q4', main)) return 'OUI'
  if (isNon('E5.N9.Q4', main)) return 'NON'
  return 'Information insuffisante'
}

function computePriorite2(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const mainQ1 = getMainAnswer(responsesMap.get('E6.N10.Q1'))
  const mainQ2 = getMainAnswer(responsesMap.get('E6.N10.Q2'))

  const q1Answered = isOui('E6.N10.Q1', mainQ1) || isNon('E6.N10.Q1', mainQ1)
  const q2Answered = isOui('E6.N10.Q2', mainQ2) || isNon('E6.N10.Q2', mainQ2)

  if (!q1Answered || !q2Answered) return 'Information insuffisante'
  if (isOui('E6.N10.Q1', mainQ1) && isOui('E6.N10.Q2', mainQ2)) return 'OUI'
  return 'NON'
}

function computePriorite3(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const r = responsesMap.get('E5.N9.Q6')
  const main = getMainAnswer(r)
  if (isNon('E5.N9.Q6', main)) return 'NON'
  if (isOui('E5.N9.Q6', main) && r) {
    const cd = buildConditionalData(r)
    if (isNonEmpty(cd.procedures_details)) return 'OUI'
  }
  return 'Information insuffisante'
}

function computeAction1(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const main = getMainAnswer(responsesMap.get('E5.N9.Q1'))
  if (isOui('E5.N9.Q1', main)) return 'OUI'
  if (isNon('E5.N9.Q1', main)) return 'NON'
  return 'Information insuffisante'
}

function computeAction2(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const r = responsesMap.get('E5.N9.Q9')
  const main = getMainAnswer(r)
  if (isNon('E5.N9.Q9', main)) return 'NON'
  if (isOui('E5.N9.Q9', main) && r) {
    const cd = buildConditionalData(r)
    if (isNonEmpty(cd.security_details)) return 'OUI'
  }
  return 'Information insuffisante'
}

function computeAction3(responsesMap: Map<string, ResponseInput>): SlotStatus {
  const main = getMainAnswer(responsesMap.get('E4.N8.Q12'))
  if (isOui('E4.N8.Q12', main)) return 'OUI'
  if (isNon('E4.N8.Q12', main)) return 'NON'
  return 'Information insuffisante'
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

export function computeSlotStatuses(responses: ResponseInput[]): SlotStatusMap {
  const map = new Map<string, ResponseInput>()
  for (const r of responses) {
    map.set(r.question_code, r)
  }

  return {
    quick_win_1: computeQuickWin1(map),
    quick_win_2: computeQuickWin2(map),
    quick_win_3: computeQuickWin3(map),
    priorite_1: computePriorite1(map),
    priorite_2: computePriorite2(map),
    priorite_3: computePriorite3(map),
    action_1: computeAction1(map),
    action_2: computeAction2(map),
    action_3: computeAction3(map),
  }
}

// ─── Post-correction des préfixes ───────────────────────────────────────────

const KNOWN_PREFIXES = ['OUI : ', 'NON : ', 'Information insuffisante : ']

/**
 * Force le préfixe d'un texte de slot à correspondre au statut attendu.
 * Retire tout préfixe existant et remet le bon.
 */
export function enforceStatusPrefix(text: string | null | undefined, expectedStatus: SlotStatus): string {
  if (!text) return `${expectedStatus} : `

  let cleaned = text
  for (const prefix of KNOWN_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length)
      break
    }
  }

  return `${expectedStatus} : ${cleaned}`
}
