import { getAbsoluteQuestionProgress, getNextQuestion, resetProgressCache } from '../questionnaire'

describe('Questionnaire Progress', () => {
  beforeEach(() => {
    // Réinitialiser le cache avant chaque test
    resetProgressCache()
  })

  describe('getAbsoluteQuestionProgress', () => {
    it('should return 0% for the first question', () => {
      const progress = getAbsoluteQuestionProgress('E4.N7.Q1')
      expect(progress.percentage).toBe(5) // First question = 1/20 = 5%
      expect(progress.current).toBe(1)
    })

    it('should return 100% for the last question', () => {
      const progress = getAbsoluteQuestionProgress('E6.N10.Q2')
      expect(progress.percentage).toBe(100)
    })

    it('should never decrease when following navigation path (branch A)', () => {
      // Simuler le parcours complet via la branche A (fournisseur)
      const answersA: Record<string, any> = {
        'E4.N7.Q1': 'E4.N7.Q1.A', // Branche A
        'E4.N7.Q1.1': 'E4.N7.Q1.1.A',
        'E4.N7.Q2': ['E4.N7.Q2.A'], // Réponse à risque pour avoir le chemin le plus long
        'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
        'E4.N7.Q3': ['E4.N7.Q3.E'],
        'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
        'E5.N9.Q4': 'E5.N9.Q4.B',
        'E5.N9.Q1': 'E5.N9.Q1.B',
        'E5.N9.Q2': 'E5.N9.Q2.B',
        'E5.N9.Q3': 'E5.N9.Q3.B',
        'E5.N9.Q5': ['E5.N9.Q5.A'],
        'E5.N9.Q6': { selected: 'E5.N9.Q6.B' },
        'E5.N9.Q7': { selected: 'E5.N9.Q7.B' },
        'E5.N9.Q8': { selected: 'E5.N9.Q8.B' },
        'E4.N8.Q12': 'E4.N8.Q12.B',
        'E4.N8.Q9': 'E4.N8.Q9.A',
        'E4.N8.Q10': 'E4.N8.Q10.A',
        'E4.N8.Q11': ['E4.N8.Q11.A'],
        'E6.N10.Q1': 'E6.N10.Q1.A'
      }

      let currentQuestion = 'E4.N7.Q1'
      let previousPercentage = 0
      const visitedQuestions: string[] = []

      while (currentQuestion) {
        visitedQuestions.push(currentQuestion)
        const progress = getAbsoluteQuestionProgress(currentQuestion)

        // Vérifier que le pourcentage ne diminue jamais
        expect(progress.percentage).toBeGreaterThanOrEqual(previousPercentage)
        previousPercentage = progress.percentage

        // Passer à la question suivante
        const nextQuestion = getNextQuestion(currentQuestion, answersA)
        if (!nextQuestion) break
        currentQuestion = nextQuestion
      }

      // Vérifier qu'on a visité plusieurs questions
      expect(visitedQuestions.length).toBeGreaterThan(10)
    })

    it('should never decrease when following navigation path (branch B)', () => {
      // Simuler le parcours via la branche B (utilisateur)
      const answersB: Record<string, any> = {
        'E4.N7.Q1': 'E4.N7.Q1.B', // Branche B
        'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
        'E4.N7.Q2': ['E4.N7.Q2.A'], // Réponse à risque
        'E4.N7.Q2.1': ['E4.N7.Q2.1.E'],
        'E4.N7.Q3': ['E4.N7.Q3.E'],
        'E4.N7.Q3.1': ['E4.N7.Q3.1.E'],
        'E5.N9.Q4': 'E5.N9.Q4.B',
        'E5.N9.Q1': 'E5.N9.Q1.B',
        'E5.N9.Q2': 'E5.N9.Q2.B',
        'E5.N9.Q3': 'E5.N9.Q3.B',
        'E5.N9.Q5': ['E5.N9.Q5.A'],
        'E5.N9.Q6': { selected: 'E5.N9.Q6.B' },
        'E5.N9.Q7': { selected: 'E5.N9.Q7.B' },
        'E5.N9.Q8': { selected: 'E5.N9.Q8.B' },
        'E4.N8.Q12': 'E4.N8.Q12.B',
        'E4.N8.Q9': 'E4.N8.Q9.A',
        'E4.N8.Q10': 'E4.N8.Q10.A',
        'E4.N8.Q11': ['E4.N8.Q11.A'],
        'E6.N10.Q1': 'E6.N10.Q1.A'
      }

      let currentQuestion = 'E4.N7.Q1'
      let previousPercentage = 0
      const visitedQuestions: string[] = []

      while (currentQuestion) {
        visitedQuestions.push(currentQuestion)
        const progress = getAbsoluteQuestionProgress(currentQuestion)

        // Vérifier que le pourcentage ne diminue jamais
        expect(progress.percentage).toBeGreaterThanOrEqual(previousPercentage)
        previousPercentage = progress.percentage

        // Passer à la question suivante
        const nextQuestion = getNextQuestion(currentQuestion, answersB)
        if (!nextQuestion) break
        currentQuestion = nextQuestion
      }

      // Vérifier qu'on a visité plusieurs questions
      expect(visitedQuestions.length).toBeGreaterThan(10)
    })

    it('should handle the critical transition from E5.N9.Q8 to E4.N8.Q12 without decreasing', () => {
      // Ce test vérifie spécifiquement la transition problématique E5.N9.Q8 → E4.N8.Q12
      // qui causait un recul de la barre de progression avant le fix
      const progressQ8 = getAbsoluteQuestionProgress('E5.N9.Q8')
      const progressQ12 = getAbsoluteQuestionProgress('E4.N8.Q12')

      expect(progressQ12.percentage).toBeGreaterThanOrEqual(progressQ8.percentage)
      expect(progressQ12.current).toBeGreaterThanOrEqual(progressQ8.current)
    })

    it('should return consistent total for all questions', () => {
      // Vérifier que le total reste constant pour toutes les questions
      const questions = [
        'E4.N7.Q1', 'E4.N7.Q1.1', 'E4.N7.Q1.2',
        'E4.N7.Q2', 'E4.N7.Q2.1', 'E4.N7.Q3', 'E4.N7.Q3.1',
        'E5.N9.Q4', 'E5.N9.Q1', 'E5.N9.Q2', 'E5.N9.Q3',
        'E5.N9.Q5', 'E5.N9.Q6', 'E5.N9.Q7', 'E5.N9.Q8',
        'E4.N8.Q12', 'E4.N8.Q9', 'E4.N8.Q10', 'E4.N8.Q11',
        'E6.N10.Q1', 'E6.N10.Q2'
      ]

      let firstTotal: number | null = null
      for (const questionId of questions) {
        const progress = getAbsoluteQuestionProgress(questionId)
        if (firstTotal === null) {
          firstTotal = progress.total
        }
        expect(progress.total).toBe(firstTotal)
      }
    })
  })

  describe('Progress monotonicity across all possible paths', () => {
    it('should have monotonically increasing progress on shortest path (no risk answers)', () => {
      // Chemin le plus court: toutes les réponses "aucun"
      const answersShortPath: Record<string, any> = {
        'E4.N7.Q1': 'E4.N7.Q1.B',
        'E4.N7.Q1.2': 'E4.N7.Q1.2.A',
        'E4.N7.Q2': ['E4.N7.Q2.G'], // Aucun
        'E4.N7.Q2.1': ['E4.N7.Q2.1.E'], // Aucun
        'E4.N7.Q3': ['E4.N7.Q3.E'], // Aucun
        'E4.N7.Q3.1': ['E4.N7.Q3.1.E'], // Aucun
        'E5.N9.Q4': 'E5.N9.Q4.A', // Oui (va directement à Q5)
        'E5.N9.Q5': ['E5.N9.Q5.A'],
        'E5.N9.Q6': { selected: 'E5.N9.Q6.B' },
        'E5.N9.Q7': { selected: 'E5.N9.Q7.B' },
        'E5.N9.Q8': { selected: 'E5.N9.Q8.B' },
        'E4.N8.Q12': 'E4.N8.Q12.B',
        'E4.N8.Q9': 'E4.N8.Q9.A',
        'E4.N8.Q10': 'E4.N8.Q10.A',
        'E4.N8.Q11': ['E4.N8.Q11.A'],
        'E6.N10.Q1': 'E6.N10.Q1.A'
      }

      let currentQuestion = 'E4.N7.Q1'
      let previousPercentage = 0
      const progressHistory: Array<{ question: string; percentage: number }> = []

      while (currentQuestion) {
        const progress = getAbsoluteQuestionProgress(currentQuestion)
        progressHistory.push({ question: currentQuestion, percentage: progress.percentage })

        // Vérifier que le pourcentage ne diminue jamais
        if (progress.percentage < previousPercentage) {
          console.error('Progress decreased!', progressHistory)
        }
        expect(progress.percentage).toBeGreaterThanOrEqual(previousPercentage)
        previousPercentage = progress.percentage

        // Passer à la question suivante
        const nextQuestion = getNextQuestion(currentQuestion, answersShortPath)
        if (!nextQuestion) break
        currentQuestion = nextQuestion
      }
    })
  })
})
