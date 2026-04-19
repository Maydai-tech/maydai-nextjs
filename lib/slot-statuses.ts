/**
 * Calcul déterministe des statuts OUI / NON / Information insuffisante
 * pour les 9 slots du rapport AI Act.
 *
 * Ce module remplace la logique auparavant déléguée au LLM :
 * le code décide du statut, le LLM ne rédige que le texte explicatif.
 *
 * Questionnaire V2 : si une question liée au slot n’est pas dans `active_question_codes`,
 * le statut est « Hors périmètre » (pas « Information insuffisante »).
 * Exception `priorite_2` : en scope dès qu’au moins une des questions E6.N10.Q1 / E6.N10.Q2 / E6.N10.Q3 est active.
 */

import {
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  normalizeQuestionnaireVersion
} from '@/lib/questionnaire-version'
import type { UseCaseChecklistResponseFields } from '@/types/questions'

/** Anciennes lignes sentinelles `usecase_responses` — à retirer avec la refonte E5/E6. */
const BPGV_CHECKLIST_RESPONSE_CODE = 'E5.N9._CHECKLIST' as const
const TRANSPARENCY_CHECKLIST_RESPONSE_CODE = 'E6.N10._CHECKLIST' as const

export type SlotStatus =
  | 'OUI'
  | 'NON'
  | 'Information insuffisante'
  | 'Hors périmètre'

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

/** Questions questionnaire servant à déterminer chaque slot (ordre = même logique que le catalogue). */
export const SLOT_QUESTION_CODES: Record<SlotKey, readonly string[]> = {
  quick_win_1: ['E5.N9.Q7'],
  quick_win_2: ['E5.N9.Q8'],
  quick_win_3: ['E5.N9.Q3'],
  priorite_1: ['E5.N9.Q4'],
  priorite_2: ['E6.N10.Q1', 'E6.N10.Q2', 'E6.N10.Q3'],
  priorite_3: ['E5.N9.Q6'],
  action_1: ['E5.N9.Q1'],
  action_2: ['E5.N9.Q9'],
  action_3: ['E4.N8.Q12'],
}

export type ComputeSlotStatusesOptions = {
  /** Liste serveur `active_question_codes` (parcours V2 effectif). */
  activeQuestionCodes?: string[] | null
  questionnaireVersion?: number | null
}

function slotQuestionsAllInActiveSet(
  activeSet: Set<string>,
  questionCodes: readonly string[]
): boolean {
  return questionCodes.every(q => activeSet.has(q))
}

/** V2 / V3 : le slot transparence est en scope dès qu’au moins une question E6.N10 du couple / fourche est dans le parcours actif. */
function priorite2InScopeV2(activeSet: Set<string>): boolean {
  return (
    activeSet.has('E6.N10.Q1') || activeSet.has('E6.N10.Q2') || activeSet.has('E6.N10.Q3')
  )
}

// ─── Types d'entrée (alignés sur usecase_responses) ─────────────────────────

export interface ResponseInput extends UseCaseChecklistResponseFields {
  question_code: string
  single_value?: string | null
  /** Lignes sentinelles checklist ou checkbox : codes sélectionnés côté `usecase_responses`. */
  multiple_codes?: string[] | null
  conditional_main?: string | null
  conditional_keys?: string[] | null
  conditional_values?: string[] | null
}

function isE5OrE6QuestionCode(code: string | undefined | null): boolean {
  return !!code && (code.startsWith('E5.N9') || code.startsWith('E6.N10'))
}

/** Ex. `E5.N9.Q7.B` → `E5.N9.Q7` */
function optionParentQuestionId(optionCode: string): string | null {
  const parts = optionCode.split('.')
  if (parts.length < 4) return null
  return parts.slice(0, 3).join('.')
}

function extractBpgvTransparencyKeyArrays(responses: ResponseInput[]): {
  bpgvKeys: string[]
  transparencyKeys: string[]
} {
  let bpgvKeys: string[] = []
  let transparencyKeys: string[] = []
  for (const r of responses) {
    const qc = r.question_code
    if (Array.isArray(r.bpgv_keys) && r.bpgv_keys.length > 0) {
      bpgvKeys = r.bpgv_keys
    } else if (qc === BPGV_CHECKLIST_RESPONSE_CODE && Array.isArray(r.multiple_codes) && r.multiple_codes.length > 0) {
      bpgvKeys = r.multiple_codes
    }
    if (Array.isArray(r.transparency_keys) && r.transparency_keys.length > 0) {
      transparencyKeys = r.transparency_keys
    } else if (
      qc === TRANSPARENCY_CHECKLIST_RESPONSE_CODE &&
      Array.isArray(r.multiple_codes) &&
      r.multiple_codes.length > 0
    ) {
      transparencyKeys = r.multiple_codes
    }
  }
  return { bpgvKeys, transparencyKeys }
}

/**
 * Fusionne les clés batch (`bpgv_keys` / `transparency_keys` ou lignes sentinelles) en
 * `single_value` par question E5/E6 pour le calcul des slots (et réutilisation OpenAI).
 */
export function applyChecklistKeyOverlayToResponses<T extends ResponseInput>(responses: T[]): T[] {
  const map = new Map<string, T>()
  for (const r of responses) {
    map.set(r.question_code, { ...r })
  }
  const { bpgvKeys, transparencyKeys } = extractBpgvTransparencyKeyArrays(responses)
  const applyKeys = (keys: string[], prefix: 'E5.N9' | 'E6.N10') => {
    for (const key of keys) {
      const qid = optionParentQuestionId(key)
      if (!qid || !qid.startsWith(prefix)) continue
      const prev = map.get(qid)
      map.set(qid, {
        ...(prev ?? ({} as T)),
        question_code: qid,
        single_value: key,
      } as T)
    }
  }
  if (bpgvKeys.length > 0) applyKeys(bpgvKeys, 'E5.N9')
  if (transparencyKeys.length > 0) applyKeys(transparencyKeys, 'E6.N10')
  return Array.from(map.values())
}

// ─── Codes d'options Oui / Non par question ─────────────────────────────────

const OUI_CODES: Record<string, string> = {
  'E5.N9.Q7':  'E5.N9.Q7.B',
  'E5.N9.Q8':  'E5.N9.Q8.B',
  'E5.N9.Q3':  'E5.N9.Q3.B',
  'E5.N9.Q4':  'E5.N9.Q4.A',
  'E5.N9.Q6':  'E5.N9.Q6.B',
  'E5.N9.Q1':  'E5.N9.Q1.A',
  'E5.N9.Q9':  'E5.N9.Q9.B',
  'E4.N8.Q12': 'E4.N8.Q12.B',
  'E6.N10.Q1': 'E6.N10.Q1.B',
  'E6.N10.Q2': 'E6.N10.Q2.B',
  'E6.N10.Q3': 'E6.N10.Q3.B',
}

const NON_CODES: Record<string, string> = {
  'E5.N9.Q7':  'E5.N9.Q7.A',
  'E5.N9.Q8':  'E5.N9.Q8.A',
  'E5.N9.Q3':  'E5.N9.Q3.B',
  'E5.N9.Q4':  'E5.N9.Q4.B',
  'E5.N9.Q6':  'E5.N9.Q6.A',
  'E5.N9.Q1':  'E5.N9.Q1.B',
  'E5.N9.Q9':  'E5.N9.Q9.A',
  'E4.N8.Q12': 'E4.N8.Q12.A',
  'E6.N10.Q1': 'E6.N10.Q1.A',
  'E6.N10.Q2': 'E6.N10.Q2.A',
  'E6.N10.Q3': 'E6.N10.Q3.A',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Ancienne persistance radio : une seule valeur sur la ligne question (sans `conditional_main`). */
function legacyDirectRadioCode(response: ResponseInput | undefined): string | null {
  if (!response) return null
  if (response.single_value) return response.single_value
  if (response.multiple_codes?.length === 1) return response.multiple_codes[0] ?? null
  return null
}

function getMainAnswer(response: ResponseInput | undefined): string | null {
  if (!response) return null
  const qc = response.question_code
  if (isE5OrE6QuestionCode(qc)) {
    return legacyDirectRadioCode(response)
  }
  return response.single_value || response.conditional_main || null
}

/**
 * Résout le code d’option déclaré pour une question E5/E6 :
 * 1) tableaux plats `bpgv_keys` / `transparency_keys` (ou ligne sentinelle déjà matérialisée en `multiple_codes`) ;
 * 2) sinon seulement `single_value` / une valeur `multiple_codes` sur la ligne — jamais `conditional_main` / champs texte.
 */
function resolveDeclaredOptionCodeForSlotQuestion(
  questionCode: string,
  bpgvKeys: string[],
  transparencyKeys: string[],
  response: ResponseInput | undefined
): string | null {
  const pool = questionCode.startsWith('E6.N10') ? transparencyKeys : bpgvKeys
  const fromPool = pool.filter((k) => optionParentQuestionId(k) === questionCode)
  if (fromPool.length === 1) return fromPool[0]
  if (fromPool.length > 1) {
    const oui = OUI_CODES[questionCode]
    const non = NON_CODES[questionCode]
    if (oui && fromPool.includes(oui)) return oui
    if (non && fromPool.includes(non)) return non
    return fromPool[0]
  }
  return legacyDirectRadioCode(response)
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

function computeQuickWin1(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q7',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q7')
  )
  if (isNon('E5.N9.Q7', main)) return 'NON'
  if (isOui('E5.N9.Q7', main)) return 'OUI'
  return 'Information insuffisante'
}

function computeQuickWin2(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q8',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q8')
  )
  if (isNon('E5.N9.Q8', main)) return 'NON'
  if (isOui('E5.N9.Q8', main)) return 'OUI'
  return 'Information insuffisante'
}

function computeQuickWin3(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q3',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q3')
  )
  if (isOui('E5.N9.Q3', main)) return 'OUI'
  if (isNon('E5.N9.Q3', main)) return 'NON'
  return 'Information insuffisante'
}

function computePriorite1(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q4',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q4')
  )
  if (isOui('E5.N9.Q4', main)) return 'OUI'
  if (isNon('E5.N9.Q4', main)) return 'NON'
  return 'Information insuffisante'
}

/** V1 (ou appel sans filtre actif) : les deux questions forment un couple obligatoire. */
function computePriorite2Legacy(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const mainQ1 = resolveDeclaredOptionCodeForSlotQuestion(
    'E6.N10.Q1',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E6.N10.Q1')
  )
  const mainQ2 = resolveDeclaredOptionCodeForSlotQuestion(
    'E6.N10.Q2',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E6.N10.Q2')
  )

  const q1Answered = isOui('E6.N10.Q1', mainQ1) || isNon('E6.N10.Q1', mainQ1)
  const q2Answered = isOui('E6.N10.Q2', mainQ2) || isNon('E6.N10.Q2', mainQ2)

  if (!q1Answered || !q2Answered) return 'Information insuffisante'
  if (isOui('E6.N10.Q1', mainQ1) && isOui('E6.N10.Q2', mainQ2)) return 'OUI'
  return 'NON'
}

/**
 * priorite_2 : si `activeSetV2` est fourni (parcours V2), une seule question peut être active ;
 * sinon logique historique à deux questions obligatoires.
 */
function computePriorite2(
  responsesMap: Map<string, ResponseInput>,
  activeSetV2: Set<string> | null,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  if (!activeSetV2) {
    return computePriorite2Legacy(responsesMap, bpgvKeys, transparencyKeys)
  }

  const q1In = activeSetV2.has('E6.N10.Q1')
  const q2In = activeSetV2.has('E6.N10.Q2')
  const q3In = activeSetV2.has('E6.N10.Q3')

  const mainQ1 = resolveDeclaredOptionCodeForSlotQuestion(
    'E6.N10.Q1',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E6.N10.Q1')
  )
  const mainQ2 = resolveDeclaredOptionCodeForSlotQuestion(
    'E6.N10.Q2',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E6.N10.Q2')
  )
  const mainQ3 = resolveDeclaredOptionCodeForSlotQuestion(
    'E6.N10.Q3',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E6.N10.Q3')
  )
  const q1Answered = isOui('E6.N10.Q1', mainQ1) || isNon('E6.N10.Q1', mainQ1)
  const q2Answered = isOui('E6.N10.Q2', mainQ2) || isNon('E6.N10.Q2', mainQ2)
  const q3Answered =
    mainQ3 != null &&
    (mainQ3 === 'E6.N10.Q3.A' || mainQ3 === 'E6.N10.Q3.B' || mainQ3 === 'E6.N10.Q3.C')
  const q3Compliant = mainQ3 === 'E6.N10.Q3.B' || mainQ3 === 'E6.N10.Q3.C'

  /** Parcours long V3 déployeur : `Q1` + étiquetage visible `Q3` (sans `Q2`). */
  if (q1In && q3In && !q2In) {
    if (!q1Answered || !q3Answered) return 'Information insuffisante'
    if (isOui('E6.N10.Q1', mainQ1) && q3Compliant) return 'OUI'
    return 'NON'
  }

  if (q1In && !q2In && !q3In) {
    if (!q1Answered) return 'Information insuffisante'
    return isOui('E6.N10.Q1', mainQ1) ? 'OUI' : 'NON'
  }
  if (!q1In && q2In && !q3In) {
    if (!q2Answered) return 'Information insuffisante'
    return isOui('E6.N10.Q2', mainQ2) ? 'OUI' : 'NON'
  }
  if (!q1In && !q2In && q3In) {
    if (!q3Answered) return 'Information insuffisante'
    return q3Compliant ? 'OUI' : 'NON'
  }

  if (q1In && q2In) {
    if (!q1Answered || !q2Answered) return 'Information insuffisante'
    if (isOui('E6.N10.Q1', mainQ1) && isOui('E6.N10.Q2', mainQ2)) return 'OUI'
    return 'NON'
  }

  return 'Information insuffisante'
}

function computePriorite3(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q6',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q6')
  )
  if (isNon('E5.N9.Q6', main)) return 'NON'
  if (isOui('E5.N9.Q6', main)) return 'OUI'
  return 'Information insuffisante'
}

function computeAction1(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q1',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q1')
  )
  if (isOui('E5.N9.Q1', main)) return 'OUI'
  if (isNon('E5.N9.Q1', main)) return 'NON'
  return 'Information insuffisante'
}

function computeAction2(
  responsesMap: Map<string, ResponseInput>,
  bpgvKeys: string[],
  transparencyKeys: string[]
): SlotStatus {
  const main = resolveDeclaredOptionCodeForSlotQuestion(
    'E5.N9.Q9',
    bpgvKeys,
    transparencyKeys,
    responsesMap.get('E5.N9.Q9')
  )
  if (isNon('E5.N9.Q9', main)) return 'NON'
  if (isOui('E5.N9.Q9', main)) return 'OUI'
  return 'Information insuffisante'
}

function computeAction3(
  responsesMap: Map<string, ResponseInput>,
  _bpgvKeys: string[],
  _transparencyKeys: string[]
): SlotStatus {
  const main = getMainAnswer(responsesMap.get('E4.N8.Q12'))
  if (isOui('E4.N8.Q12', main)) return 'OUI'
  if (isNon('E4.N8.Q12', main)) return 'NON'
  return 'Information insuffisante'
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

export function computeSlotStatuses(
  responses: ResponseInput[],
  options?: ComputeSlotStatusesOptions
): SlotStatusMap {
  const { bpgvKeys, transparencyKeys } = extractBpgvTransparencyKeyArrays(responses)
  const enriched = applyChecklistKeyOverlayToResponses(responses)
  const map = new Map<string, ResponseInput>()
  for (const r of enriched) {
    map.set(r.question_code, r)
  }

  const qv = normalizeQuestionnaireVersion(options?.questionnaireVersion)
  const rawActive = options?.activeQuestionCodes
  const useV2Scope =
    (qv === QUESTIONNAIRE_VERSION_V2 || qv === QUESTIONNAIRE_VERSION_V3) &&
    Array.isArray(rawActive) &&
    rawActive.length > 0
  const activeSet = useV2Scope ? new Set(rawActive) : null

  const run = (
    slot: SlotKey,
    compute: (m: Map<string, ResponseInput>, bk: string[], tk: string[]) => SlotStatus
  ): SlotStatus => {
    if (activeSet && !slotQuestionsAllInActiveSet(activeSet, SLOT_QUESTION_CODES[slot])) {
      return 'Hors périmètre'
    }
    return compute(map, bpgvKeys, transparencyKeys)
  }

  const priorite2 =
    activeSet && !priorite2InScopeV2(activeSet)
      ? ('Hors périmètre' as const)
      : computePriorite2(map, activeSet, bpgvKeys, transparencyKeys)

  return {
    quick_win_1: run('quick_win_1', computeQuickWin1),
    quick_win_2: run('quick_win_2', computeQuickWin2),
    quick_win_3: run('quick_win_3', computeQuickWin3),
    priorite_1: run('priorite_1', computePriorite1),
    priorite_2: priorite2,
    priorite_3: run('priorite_3', computePriorite3),
    action_1: run('action_1', computeAction1),
    action_2: run('action_2', computeAction2),
    action_3: run('action_3', computeAction3),
  }
}

// ─── Post-correction des préfixes ───────────────────────────────────────────

const KNOWN_PREFIXES = [
  'OUI : ',
  'NON : ',
  'Information insuffisante : ',
  'Hors périmètre : ',
]

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
