/**
 * Contrat technique commun questionnaire V1 / V2 (versions, variantes BPGV, sortie ORS).
 * Éviter les littéraux épars dans l’app et les routes API.
 */

export const QUESTIONNAIRE_VERSION_V1 = 1 as const
export const QUESTIONNAIRE_VERSION_V2 = 2 as const
export const QUESTIONNAIRE_VERSION_V3 = 3 as const

export type QuestionnaireVersion =
  | typeof QUESTIONNAIRE_VERSION_V1
  | typeof QUESTIONNAIRE_VERSION_V2
  | typeof QUESTIONNAIRE_VERSION_V3

export const QUESTIONNAIRE_VERSIONS: readonly QuestionnaireVersion[] = [
  QUESTIONNAIRE_VERSION_V1,
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
]

export function isQuestionnaireVersion(v: unknown): v is QuestionnaireVersion {
  return (
    v === QUESTIONNAIRE_VERSION_V1 ||
    v === QUESTIONNAIRE_VERSION_V2 ||
    v === QUESTIONNAIRE_VERSION_V3
  )
}

export function normalizeQuestionnaireVersion(v: unknown): QuestionnaireVersion {
  if (v === QUESTIONNAIRE_VERSION_V3) return QUESTIONNAIRE_VERSION_V3
  if (v === QUESTIONNAIRE_VERSION_V2) return QUESTIONNAIRE_VERSION_V2
  return QUESTIONNAIRE_VERSION_V1
}

/** Variante du bloc BPGV (après ORS en V2). */
export const BPGV_VARIANT_MINIMAL = 'minimal' as const
export const BPGV_VARIANT_LIMITED = 'limited' as const
export const BPGV_VARIANT_HIGH = 'high' as const
export const BPGV_VARIANT_UNACCEPTABLE = 'unacceptable' as const

export type BpgvVariant =
  | typeof BPGV_VARIANT_MINIMAL
  | typeof BPGV_VARIANT_LIMITED
  | typeof BPGV_VARIANT_HIGH
  | typeof BPGV_VARIANT_UNACCEPTABLE

export const BPGV_VARIANTS: readonly BpgvVariant[] = [
  BPGV_VARIANT_MINIMAL,
  BPGV_VARIANT_LIMITED,
  BPGV_VARIANT_HIGH,
  BPGV_VARIANT_UNACCEPTABLE
]

export function isBpgvVariant(v: unknown): v is BpgvVariant {
  return (
    v === BPGV_VARIANT_MINIMAL ||
    v === BPGV_VARIANT_LIMITED ||
    v === BPGV_VARIANT_HIGH ||
    v === BPGV_VARIANT_UNACCEPTABLE
  )
}

/** Sortie du bloc ORS (N7 + N8) en V2. */
export const ORS_EXIT_UNACCEPTABLE = 'unacceptable' as const
export const ORS_EXIT_N8_COMPLETED = 'n8_completed' as const

export type OrsExit = typeof ORS_EXIT_UNACCEPTABLE | typeof ORS_EXIT_N8_COMPLETED

export const ORS_EXITS: readonly OrsExit[] = [ORS_EXIT_UNACCEPTABLE, ORS_EXIT_N8_COMPLETED]

export function isOrsExit(v: unknown): v is OrsExit {
  return v === ORS_EXIT_UNACCEPTABLE || v === ORS_EXIT_N8_COMPLETED
}
