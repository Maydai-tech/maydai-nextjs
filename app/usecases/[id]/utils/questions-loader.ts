import { Question } from '../types/usecase'
import questionsData from '../data/questions-with-scores.json'

// Cache des questions pour éviter les re-lectures répétées
let questionsCache: Record<string, Question> | null = null

/**
 * Charge et retourne toutes les questions depuis le fichier JSON
 */
export function loadQuestions(): Record<string, Question> {
  if (questionsCache) {
    return questionsCache
  }

  // Convertir les données JSON en format Question compatible
  const questions: Record<string, Question> = {}
  
  for (const [questionId, questionData] of Object.entries(questionsData as any)) {
    const data = questionData as any
    questions[questionId] = {
      id: data.id,
      question: data.question,
      type: data.type as 'radio' | 'checkbox' | 'tags' | 'conditional',
      options: data.options.map((option: any) => ({
        code: option.code,
        label: option.label,
        score_impact: option.score_impact || 0,
        category_impacts: option.category_impacts || undefined,
        is_eliminatory: option.is_eliminatory || false,
        unique_answer: option.unique_answer || false
      })),
      required: data.required,
      conditionalFields: data.conditionalFields || undefined
    }
  }

  questionsCache = questions
  return questions
}

/**
 * Récupère une question spécifique par son ID
 */
export function getQuestionById(id: string): Question | null {
  const questions = loadQuestions()
  return questions[id] || null
}

/**
 * Récupère toutes les questions triées par ID
 */
export function getAllQuestions(): Question[] {
  const questions = loadQuestions()
  return Object.values(questions).sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Récupère plusieurs questions par leurs IDs
 */
export function getQuestionsByIds(ids: string[]): Question[] {
  const questions = loadQuestions()
  return ids
    .map(id => questions[id])
    .filter(question => question !== undefined)
}

/**
 * Récupère tous les IDs de questions dans l'ordre
 */
export function getAllQuestionIds(): string[] {
  const questions = loadQuestions()
  return Object.keys(questions).sort()
}

/**
 * Vérifie si une question existe
 */
export function questionExists(id: string): boolean {
  const questions = loadQuestions()
  return id in questions
}

/**
 * Efface le cache des questions (utile pour les tests)
 */
export function clearQuestionsCache(): void {
  questionsCache = null
}