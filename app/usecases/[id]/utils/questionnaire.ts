import { Question, QuestionAnswer, QuestionProgress } from '../types/usecase'

// Navigation logic
export const getNextQuestion = (currentQuestionId: string, answers: Record<string, any>): string | null => {
  switch (currentQuestionId) {
    case 'E4.N7.Q1':
      return 'E4.N7.Q2'
    case 'E4.N7.Q2':
      return 'E4.N7.Q3'
    case 'E4.N7.Q3':
      // Check if any high-risk domain/activity is selected
      const q2Answers = answers['E4.N7.Q2'] || []
      const q3Answers = answers['E4.N7.Q3'] || []
      const hasRiskAnswers = (q2Answers.length > 0 && !q2Answers.includes('E4.N7.Q2.I')) ||
                           (q3Answers.length > 0 && !q3Answers.includes('E4.N7.Q3.I'))
      return hasRiskAnswers ? 'E5.N8.Q1' : 'E4.N8.Q12'
    
    // High-risk sequence
    case 'E5.N8.Q1': return 'E5.N8.Q2'
    case 'E5.N8.Q2': return 'E5.N9.Q3'
    case 'E5.N9.Q3': return 'E5.N9.Q4'
    case 'E5.N9.Q4': return 'E5.N9.Q5'
    case 'E5.N9.Q5': return 'E5.N9.Q6'
    case 'E5.N9.Q6': return 'E5.N9.Q7'
    case 'E5.N9.Q7': return 'E5.N9.Q8'
    case 'E5.N9.Q8': return 'E5.N9.Q9'
    case 'E5.N9.Q9': return 'E4.N8.Q12'
    
    // Critical question
    case 'E4.N8.Q12':
      return answers['E4.N8.Q12'] === 'E4.N8.Q12.A' ? null : 'E4.N8.Q9' // End if games/spam, continue otherwise
    
    // Additional questions
    case 'E4.N8.Q9':
      return answers['E4.N8.Q9'] === 'E4.N8.Q9.A' ? 'E4.N8.Q10' : 'E4.N8.Q11'
    case 'E4.N8.Q10': return 'E4.N8.Q11'
    case 'E4.N8.Q11': return 'E6.N10.Q1'
    
    // Transparency questions
    case 'E6.N10.Q1': return 'E6.N10.Q2'
    case 'E6.N10.Q2': return null // End
    
    default: return null
  }
}

export const getQuestionProgress = (currentQuestionId: string, answers: Record<string, any>): QuestionProgress => {
  // Calculate estimated total questions based on current path
  let totalQuestions = 3 // Always Q1, Q2, Q3
  
  const q2Answers = answers['E4.N7.Q2'] || []
  const q3Answers = answers['E4.N7.Q3'] || []
  const hasRiskAnswers = (q2Answers.length > 0 && !q2Answers.includes('E4.N7.Q2.I')) ||
                        (q3Answers.length > 0 && !q3Answers.includes('E4.N7.Q3.I'))
  
  if (hasRiskAnswers) {
    totalQuestions += 9 // High-risk sequence
  }
  
  totalQuestions += 1 // E4.N8.Q12
  
  if (answers['E4.N8.Q12'] === 'E4.N8.Q12.B') {
    totalQuestions += 3 // E4.N8.Q9, Q11, transparency questions
    if (answers['E4.N8.Q9'] === 'E4.N8.Q9.A') {
      totalQuestions += 1 // E4.N8.Q10
    }
  }
  
  // Count current progress
  const questionOrder = ['E4.N7.Q1', 'E4.N7.Q2', 'E4.N7.Q3']
  if (hasRiskAnswers) {
    questionOrder.push('E5.N8.Q1', 'E5.N8.Q2', 'E5.N9.Q3', 'E5.N9.Q4', 'E5.N9.Q5', 'E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8', 'E5.N9.Q9')
  }
  questionOrder.push('E4.N8.Q12')
  if (answers['E4.N8.Q12'] === 'E4.N8.Q12.B') {
    questionOrder.push('E4.N8.Q9')
    if (answers['E4.N8.Q9'] === 'E4.N8.Q9.A') {
      questionOrder.push('E4.N8.Q10')
    }
    questionOrder.push('E4.N8.Q11', 'E6.N10.Q1', 'E6.N10.Q2')
  }
  
  const currentIndex = questionOrder.indexOf(currentQuestionId) + 1
  
  return {
    current: currentIndex,
    total: totalQuestions,
    percentage: Math.round((currentIndex / totalQuestions) * 100)
  }
}

// Nouvelle fonction pour calculer la progression basée sur le maximum absolu de questions
export const getAbsoluteQuestionProgress = (currentQuestionId: string): QuestionProgress => {
  // Nombre maximum absolu de questions possibles dans le questionnaire
  // 3 (base) + 9 (high-risk) + 1 (critical) + 3 (additional) + 2 (transparency) = 18
  const MAX_QUESTIONS = 18
  
  // Ordre global de toutes les questions possibles
  const ALL_QUESTIONS = [
    'E4.N7.Q1', 'E4.N7.Q2', 'E4.N7.Q3', // Base questions (3)
    'E5.N8.Q1', 'E5.N8.Q2', 'E5.N9.Q3', 'E5.N9.Q4', 'E5.N9.Q5', 'E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8', 'E5.N9.Q9', // High-risk sequence (9)
    'E4.N8.Q12', // Critical question (1)
    'E4.N8.Q9', 'E4.N8.Q10', 'E4.N8.Q11', // Additional questions (3)
    'E6.N10.Q1', 'E6.N10.Q2' // Transparency questions (2)
  ]
  
  // Trouver l'index de la question courante
  const currentIndex = ALL_QUESTIONS.indexOf(currentQuestionId)
  
  // Si la question n'est pas trouvée, retourner 0
  if (currentIndex === -1) {
    return {
      current: 0,
      total: MAX_QUESTIONS,
      percentage: 0
    }
  }
  
  // Calculer la progression basée sur la position dans l'ordre global
  const current = currentIndex + 1
  const percentage = Math.round((current / MAX_QUESTIONS) * 100)
  
  return {
    current,
    total: MAX_QUESTIONS,
    percentage
  }
}

// Navigation logic for going back to previous question
export const getPreviousQuestion = (currentQuestionId: string, questionHistory: string[]): string | null => {
  // Find the current question in the history
  const currentIndex = questionHistory.indexOf(currentQuestionId)
  
  // If we're at the beginning or question not found in history, return null
  if (currentIndex <= 0) {
    return null
  }
  
  // Return the previous question from history
  return questionHistory[currentIndex - 1]
}

// Helper function to build the question path based on current state
export const buildQuestionPath = (currentQuestionId: string, answers: Record<string, any>): string[] => {
  const path: string[] = []
  let questionId: string | null = 'E4.N7.Q1' // Start from the first question
  
  // Build the path by following the navigation logic
  while (questionId && questionId !== currentQuestionId) {
    path.push(questionId)
    questionId = getNextQuestion(questionId, answers)
  }
  
  // Add the current question
  if (questionId === currentQuestionId) {
    path.push(currentQuestionId)
  }
  
  return path
}

// Helper function to check if user can proceed
export const checkCanProceed = (question: Question, answer: any): boolean => {
  if (!question) return false
  
  switch (question.type) {
    case 'radio':
      return typeof answer === 'string' && answer.length > 0
    case 'checkbox':
      return Array.isArray(answer) && answer.length > 0
    case 'tags':
      return Array.isArray(answer) && answer.length > 0
    case 'conditional':
      if (!answer) return false
      if (typeof answer === 'string') return answer.length > 0
      if (typeof answer === 'object' && answer.selected) {
        // Check if it's a "Oui" option (ends with .B) with conditional fields or "Other" option (E4.N8.Q10.G)
        const isYesWithConditional = answer.selected.endsWith('.B') && question.conditionalFields && question.conditionalFields.length > 0
        const isOtherOption = answer.selected === 'E4.N8.Q10.G'
        
        if (isYesWithConditional || isOtherOption) {
          return answer.conditionalValues && Object.values(answer.conditionalValues).some((v: any) => v && v.length > 0)
        }
        return true
      }
      return false
    default:
      return false
  }
}

// Utility functions for styling
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'high': return 'text-red-700 bg-red-50 border border-red-200'
    case 'limited': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
    case 'minimal': return 'text-green-700 bg-green-50 border border-green-200'
    case 'unacceptable': return 'text-red-800 bg-red-100 border border-red-300'
    default: return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
}

export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'terminé': return 'text-green-700 bg-green-50 border border-green-200'
    case 'en cours': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
    case 'à compléter': return 'text-gray-700 bg-gray-50 border border-gray-200'
    default: return 'text-gray-700 bg-gray-50 border border-gray-200'
  }
}

export const getUseCaseStatusInFrench = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'active': 
      return 'Terminé'
    case 'in_progress':
    case 'under_review':
      return 'En cours'
    case 'draft':
    case 'not_started':
    default:
      return 'À compléter'
  }
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
} 