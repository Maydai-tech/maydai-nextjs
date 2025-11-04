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
}

/**
 * Collection de toutes les questions indexées par ID
 */
export type QuestionsData = Record<string, Question>;


