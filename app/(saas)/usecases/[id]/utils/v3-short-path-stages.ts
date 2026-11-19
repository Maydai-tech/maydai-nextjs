import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from './questionnaire-v3-graph'

/** Sélection brute d’une étape parcours court (codes d’options cochées). */
export function normalizeShortPathStageSelection(answer: unknown): string[] {
  if (!Array.isArray(answer)) return []
  return answer.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/**
 * Pivots ORS segments 1–4 (mêmes `question_code` en court et en long).
 * Ne doivent jamais être écrasés par le dépliage des packs synthétiques.
 */
export const EARLY_E4_PIVOT_QUESTION_IDS = [
  'E4.N7.Q1',
  'E4.N7.Q1.1',
  'E4.N7.Q1.2',
  'E4.N7.Q3',
  'E4.N7.Q3.1',
  'E4.N7.Q2.1',
  'E4.N7.Q4',
  'E4.N7.Q2',
  'E4.N7.Q5',
  'E4.N8.Q9',
  'E4.N8.Q9.1',
  'E4.N8.Q11.0',
  'E4.N8.Q11.1',
  'E4.N8.Q11.T1',
  'E4.N8.Q11.M1',
  'E4.N8.Q11.M2',
  'E4.N8.Q10',
] as const

export function isEarlyE4PivotQuestionId(questionId: string): boolean {
  return (EARLY_E4_PIVOT_QUESTION_IDS as readonly string[]).includes(questionId)
}

function assignAnswerValue(
  out: Record<string, string | string[]>,
  qid: string,
  raw: unknown
): void {
  if (typeof raw === 'string' && raw.length > 0) {
    out[qid] = raw
    return
  }
  if (Array.isArray(raw) && raw.length > 0) {
    out[qid] = raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
    return
  }
  if (raw && typeof raw === 'object' && 'selected' in (raw as Record<string, unknown>)) {
    const sel = (raw as { selected?: unknown }).selected
    if (typeof sel === 'string' && sel.length > 0) out[qid] = sel
  }
}

/**
 * Matrice de dépliage pack court → questions radio du parcours long.
 * Tag coché = valeur positive (Oui) ; absent = valeur négative (Non).
 */
export function unfoldShortPathPackToLongAnswers(
  packId: string,
  selection: string[]
): Record<string, string> {
  const s = new Set(selection)

  if (packId === V3_SHORT_ENTREPRISE_ID) {
    return {
      'E5.N9.Q7': s.has('E5.N9.Q7.B') ? 'E5.N9.Q7.B' : 'E5.N9.Q7.A',
      'E5.N9.Q1': s.has('E5.N9.Q1.A') ? 'E5.N9.Q1.A' : 'E5.N9.Q1.B',
      'E4.N8.Q12': s.has('E4.N8.Q12.B') ? 'E4.N8.Q12.B' : 'E4.N8.Q12.A',
    }
  }

  if (packId === V3_SHORT_USAGE_ID) {
    return {
      'E5.N9.Q3': s.has('E5.N9.Q3.A') ? 'E5.N9.Q3.B' : 'E5.N9.Q3.A',
      'E5.N9.Q4': s.has('E5.N9.Q4.A') ? 'E5.N9.Q4.A' : 'E5.N9.Q4.B',
      'E5.N9.Q6': s.has('E5.N9.Q6.B') ? 'E5.N9.Q6.B' : 'E5.N9.Q6.A',
      'E5.N9.Q8': s.has('E5.N9.Q8.B') ? 'E5.N9.Q8.B' : 'E5.N9.Q8.A',
      'E5.N9.Q9': s.has('E5.N9.Q9.B') ? 'E5.N9.Q9.B' : 'E5.N9.Q9.A',
    }
  }

  if (packId === V3_SHORT_TRANSPARENCE_ID) {
    const q1Yes =
      s.has('E6.N10.Q1.B') ||
      s.has('E6.N10.TRANSPARENCY_PACK.INTERACTION') ||
      s.has('E6.N10.TRANSPARENCY_PACK.A')
    const q2Yes =
      s.has('E6.N10.Q2.B') ||
      s.has('E6.N10.TRANSPARENCY_PACK.CONTENT') ||
      s.has('E6.N10.TRANSPARENCY_PACK.A')
    let q3: string = 'E6.N10.Q3.A'
    if (s.has('E6.N10.Q3.B')) q3 = 'E6.N10.Q3.B'
    else if (s.has('E6.N10.Q3.C')) q3 = 'E6.N10.Q3.C'
    return {
      'E6.N10.Q1': q1Yes ? 'E6.N10.Q1.B' : 'E6.N10.Q1.A',
      'E6.N10.Q2': q2Yes ? 'E6.N10.Q2.B' : 'E6.N10.Q2.A',
      'E6.N10.Q3': q3,
    }
  }

  if (packId === V3_SHORT_SOCIAL_ENV_ID) {
    const ok = s.has('E7.N11.Q3.B')
    return {
      'E7.N11.Q1': ok ? 'E7.N11.Q1.B' : 'E7.N11.Q1.A',
      'E7.N11.Q2': ok ? 'E7.N11.Q2.B' : 'E7.N11.Q2.A',
    }
  }

  return {}
}

/** Déplie tous les packs `V3_SHORT_*` déjà touchés (y compris sélection vide = tous « Non »). */
export function unfoldAllShortPathPacksInAnswers(
  answers: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {}
  const packIds = [
    V3_SHORT_ENTREPRISE_ID,
    V3_SHORT_USAGE_ID,
    V3_SHORT_TRANSPARENCE_ID,
    V3_SHORT_SOCIAL_ENV_ID,
  ] as const
  for (const packId of packIds) {
    if (!(packId in answers)) continue
    const sel = normalizeShortPathStageSelection(answers[packId])
    Object.assign(out, unfoldShortPathPackToLongAnswers(packId, sel))
  }
  return out
}

/**
 * Extrait les pivots E4 segments 1–4 depuis l’état réponses (mémoire collective).
 * Liste explicite en priorité, puis tout autre `E4.N7.*` / pivot N8 hors packs.
 */
export function collectEarlyE4PivotAnswers(
  answers: Record<string, unknown>
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}

  for (const qid of EARLY_E4_PIVOT_QUESTION_IDS) {
    if (answers[qid] !== undefined && answers[qid] !== null) {
      assignAnswerValue(out, qid, answers[qid])
    }
  }

  for (const [qid, raw] of Object.entries(answers)) {
    if (!qid.startsWith('E4.')) continue
    if (qid.startsWith('V3_') || qid.startsWith('V3.')) continue
    if (qid in out) continue
    if (qid === 'E4.N8.Q12') continue
    assignAnswerValue(out, qid, raw)
  }

  return out
}

/**
 * Patches longs : pivots E4 d’abord, puis dépliage packs (E4.N8.Q12 et E5/E6/E7).
 * Les clés `E4.N7.*` des pivots ne sont jamais écrasées par les packs.
 */
export function buildShortPathLongAnswerPatches(
  answers: Record<string, unknown>,
  opts?: { packId?: string; selection?: string[] }
): Record<string, string | string[]> {
  const merged = { ...answers }
  if (opts?.packId != null && opts.selection) {
    merged[opts.packId] = opts.selection
  }

  const e4Pivots = collectEarlyE4PivotAnswers(merged)
  const packUnfold = unfoldAllShortPathPacksInAnswers(merged)
  const out: Record<string, string | string[]> = { ...packUnfold }

  for (const [qid, val] of Object.entries(e4Pivots)) {
    if (qid.startsWith('E4.N7.') || isEarlyE4PivotQuestionId(qid)) {
      out[qid] = val
    } else if (!(qid in out)) {
      out[qid] = val
    }
  }

  return out
}

/** @deprecated Utiliser `unfoldShortPathPackToLongAnswers` */
export function declarativeAnswersAfterEnterpriseStage(selection: string[]): Record<string, string> {
  return unfoldShortPathPackToLongAnswers(V3_SHORT_ENTREPRISE_ID, selection)
}

/** @deprecated Utiliser `unfoldShortPathPackToLongAnswers` */
export function declarativeAnswersAfterUsageStage(selection: string[]): Record<string, string> {
  return unfoldShortPathPackToLongAnswers(V3_SHORT_USAGE_ID, selection)
}

/** @deprecated Utiliser `unfoldShortPathPackToLongAnswers` */
export function declarativeAnswersAfterTransparenceStage(selection: string[]): Record<string, string> {
  return unfoldShortPathPackToLongAnswers(V3_SHORT_TRANSPARENCE_ID, selection)
}

/** @deprecated Utiliser `unfoldShortPathPackToLongAnswers` */
export function declarativeAnswersAfterSocialEnvStage(selection: string[]): Record<string, string> {
  return unfoldShortPathPackToLongAnswers(V3_SHORT_SOCIAL_ENV_ID, selection)
}
