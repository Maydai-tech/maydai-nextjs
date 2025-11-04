/**
 * Loader pour les questions du formulaire de création de use case
 * 
 * Ce fichier charge les questions depuis le JSON et les expose avec le typage TypeScript.
 */

import creationQuestionsData from './creation-questions.json';

export interface Tooltip {
  title: string;
  shortContent: string;
  fullContent?: string;
  icon?: string;
}

export interface QuestionOption {
  label: string;
  examples?: string[];
  tooltip?: Tooltip;
}

export interface CreationQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'countries';
  options?: string[] | QuestionOption[];
  placeholder?: string;
  maxLength?: number;
  hasOtherOption?: boolean;
  tooltip?: Tooltip;
}

/**
 * Charge toutes les questions du formulaire de création
 */
export function loadCreationQuestions(): Record<string, CreationQuestion> {
  return creationQuestionsData as Record<string, CreationQuestion>;
}

/**
 * Récupère une question spécifique par son ID
 */
export function getCreationQuestion(id: string): CreationQuestion | undefined {
  const questions = loadCreationQuestions();
  return questions[id];
}

/**
 * Récupère toutes les questions dans l'ordre défini
 */
export function getAllCreationQuestions(): CreationQuestion[] {
  const questions = loadCreationQuestions();
  const order = [
    'name',
    'deployment_date',
    'responsible_service',
    'technology_partner',
    'llm_model_version',
    'ai_category',
    'system_type',
    'deployment_countries',
    'description'
  ];
  
  return order.map(id => questions[id]).filter(Boolean);
}


