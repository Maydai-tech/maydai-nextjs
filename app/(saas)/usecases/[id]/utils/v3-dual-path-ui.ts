import { normalizeQuestionnaireVersion, QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'

/** Entrées questionnaire court / long V3 sur la synthèse et le header (affichage uniquement). */
export function showV3DualPathEntrypoints(questionnaireVersion: unknown): boolean {
  return normalizeQuestionnaireVersion(questionnaireVersion) === QUESTIONNAIRE_VERSION_V3
}
