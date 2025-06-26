import { getAnswerImpact, QUESTION_CODE_MAPPING, QUESTION_SCORING_CONFIG } from '../scoring-config'

describe('Scoring Configuration', () => {
  describe('getAnswerImpact', () => {
    // Tests pour les questions générales (OUI/NON)
    test('should return 0 for OUI answers in general compliance', () => {
      expect(getAnswerImpact('E6.N10.Q1', 'E6.N10.Q1.A')).toBe(0)
      expect(getAnswerImpact('E5.N9.Q9', 'E5.N9.Q9.A')).toBe(0)
    })

    test('should return -5 for NON answers in general compliance', () => {
      expect(getAnswerImpact('E6.N10.Q1', 'E6.N10.Q1.B')).toBe(-5)
      expect(getAnswerImpact('E5.N9.Q9', 'E5.N9.Q9.B')).toBe(-5)
    })

    // Tests pour les types de données
    test('should handle data types correctly', () => {
      expect(getAnswerImpact('E5.N9.Q5', 'Publiques')).toBe(0)
      expect(getAnswerImpact('E5.N9.Q5', 'Personnelles')).toBe(-5)
      expect(getAnswerImpact('E5.N9.Q5', 'Sensibles')).toBe(-5)
      expect(getAnswerImpact('E5.N9.Q5', 'Stratégiques')).toBe(-5)
    })

    // Tests pour les questions inversées
    test('should handle inverted questions correctly', () => {
      expect(getAnswerImpact('E4.N8.Q11', 'E4.N8.Q11.A')).toBe(-5) // OUI = -5
      expect(getAnswerImpact('E4.N8.Q11', 'E4.N8.Q11.B')).toBe(0)  // NON = 0
    })

    // Tests pour les cas spéciaux
    test('should handle bonus case correctly', () => {
      expect(getAnswerImpact('E4.N8.Q12', 'E4.N8.Q12.A')).toBe(10) // Bonus!
      expect(getAnswerImpact('E4.N8.Q12', 'E4.N8.Q12.B')).toBe(0)
    })

    // Tests pour les pratiques interdites
    test('should handle prohibited practices with severe penalties', () => {
      expect(getAnswerImpact('E4.N7.Q3', 'E4.N7.Q3.H')).toBe(-50) // Notation sociale
      expect(getAnswerImpact('E4.N7.Q3', 'E4.N7.Q3.I')).toBe(0)   // Aucune
    })

    // Tests pour les domaines à haut risque
    test('should handle high-risk domains correctly', () => {
      expect(getAnswerImpact('E4.N7.Q2', 'E4.N7.Q2.A')).toBe(-30) // High-risk
      expect(getAnswerImpact('E4.N7.Q2', 'E4.N7.Q2.I')).toBe(0)   // Aucun
    })

    // Tests pour les questions de nombre d'utilisateurs
    test('should handle user count questions correctly', () => {
      expect(getAnswerImpact('E4.N8.Q10', 'E4.N8.Q10.A')).toBe(0)  // < 100
      expect(getAnswerImpact('E4.N8.Q10', 'E4.N8.Q10.B')).toBe(-5) // > 100
      expect(getAnswerImpact('E4.N8.Q10', 'E4.N8.Q10.C')).toBe(-5) // > 1000
    })

    // Tests pour les questions inconnues
    test('should return 0 for unknown questions or answers', () => {
      expect(getAnswerImpact('UNKNOWN.Q', 'UNKNOWN.A')).toBe(0)
      expect(getAnswerImpact('E6.N10.Q1', 'UNKNOWN.ANSWER')).toBe(0)
    })
  })

  describe('Configuration integrity', () => {
    test('should have all required question mappings', () => {
      const requiredQuestions = [
        'E6.N10.Q2', 'E6.N10.Q1', 'E5.N9.Q9', 'E5.N9.Q8', 'E5.N9.Q7',
        'E5.N9.Q6', 'E5.N9.Q5', 'E5.N9.Q4', 'E5.N9.Q3', 'E5.N8.Q2',
        'E5.N8.Q1', 'E4.N8.Q12', 'E4.N8.Q11', 'E4.N8.Q10', 'E4.N8.Q9',
        'E4.N8.Q8', 'E4.N8.Q7', 'E4.N8.Q6', 'E4.N8.Q5', 'E4.N8.Q4',
        'E4.N8.Q3', 'E4.N8.Q2', 'E4.N8.Q1', 'E4.N7.Q3', 'E4.N7.Q2'
      ]

      const availableQuestions = Object.keys(QUESTION_CODE_MAPPING)
      
      requiredQuestions.forEach(questionCode => {
        expect(availableQuestions).toContain(questionCode)
      })
      
      // Au minimum, nous devons avoir toutes les questions requises
      expect(availableQuestions.length).toBeGreaterThanOrEqual(requiredQuestions.length)
    })

    test('should have valid scoring rules', () => {
      expect(QUESTION_SCORING_CONFIG.general_compliance).toEqual({
        'OUI': 0,
        'NON': -5
      })

      expect(QUESTION_SCORING_CONFIG.data_types).toEqual({
        'Publiques': 0,
        'Personnelles': -5,
        'Stratégiques': -5,
        'Sensibles': -5
      })
    })

    test('should have consistent answer codes', () => {
      // Vérifier que toutes les questions avec des codes spécifiques ont des réponses A et B
      const specificQuestions = Object.entries(QUESTION_CODE_MAPPING)
        .filter(([, mapping]) => typeof mapping === 'object')

      specificQuestions.forEach(([questionCode, mapping]) => {
        if (typeof mapping === 'object') {
          const answerCodes = Object.keys(mapping as Record<string, number>)
          expect(answerCodes.length).toBeGreaterThan(0)
          
          // Vérifier que les codes de réponse suivent le pattern questionCode + suffix
          answerCodes.forEach(answerCode => {
            if (answerCode !== 'Publiques' && answerCode !== 'Personnelles' && 
                answerCode !== 'Sensibles' && answerCode !== 'Stratégiques') {
              expect(answerCode).toMatch(new RegExp(`^${questionCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`))
            }
          })
        }
      })
    })
  })
}) 