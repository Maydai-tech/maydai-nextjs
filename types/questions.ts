/**
 * Types et interfaces pour les questions du questionnaire IA Act
 * 
 * Ces types définissent la structure des questions et options de réponse
 * utilisées dans le questionnaire d'évaluation des cas d'usage IA.
 */

/**
 * Structure d'une infobulle (tooltip)
 * Utilisée pour fournir des informations contextuelles sur les questions et réponses
 */
export interface Tooltip {
  title: string;
  shortContent: string;
  fullContent?: string;
  icon?: string;
}

/**
 * Option de réponse pour une question
 */
export interface QuestionOption {
  code: string;
  label: string;
  description?: string;
  score_impact?: number;
  category_impacts?: Record<string, number>;
  is_eliminatory?: boolean;
  unique_answer?: boolean;
  risk?: string;
  tooltip?: Tooltip;
}

/**
 * Structure d'une question du questionnaire
 */
export interface Question {
  id: string;
  question: string;
  /** Ligne de contexte sous le titre (ex. rappel juridique court) */
  context_subtitle?: string;
  /** Court texte d’aide sous le libellé (affiché par QuestionRenderer) */
  description?: string;
  type: 'radio' | 'checkbox' | 'tags' | 'conditional';
  required: boolean;
  risk?: string;
  options: QuestionOption[];
  conditionalFields?: Array<{
    key: string;
    label: string;
    placeholder: string;
  }>;
  tooltip?: Tooltip;
  todo_action?: string;
  /** Mode d'impact pour les questions checkbox/tags: 'any' = impact unique si au moins une option sélectionnée */
  impact_mode?: 'any' | 'cumulative';
}

/**
 * Collection de toutes les questions indexées par ID
 */
export type QuestionsData = Record<string, Question>;

/**
 * Champs optionnels côté persistance / API pour le batch E5 (N9) et E6 (N10).
 * Les clés sont des codes d’option (ex. `E5.N9.Q1.B`, `E6.N10.Q1.A`).
 * Peuvent coexister avec `single_value` / `multiple_codes` des autres blocs.
 */
export interface UseCaseChecklistResponseFields {
  bpgv_keys?: string[] | null
  transparency_keys?: string[] | null
}

/**
 * Lignes sentinelles `usecase_responses.question_code` pour enregistrer
 * uniquement les tableaux batch (sans colonnes DB dédiées).
 * À synchroniser avec la logique Edge `calculate-usecase-score`.
 */
export const BPGV_CHECKLIST_RESPONSE_CODE = 'E5.N9._CHECKLIST' as const
export const TRANSPARENCY_CHECKLIST_RESPONSE_CODE = 'E6.N10._CHECKLIST' as const


