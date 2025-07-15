import { loadQuestions } from '../utils/questions-loader'
import { UseCaseScore, ScoreBreakdown, CategoryScore } from '../types/usecase'
import { RISK_CATEGORIES, QUESTION_RISK_CATEGORY_MAPPING } from './risk-categories'

const BASE_SCORE = 100

// Fonction utilitaire pour obtenir l'impact d'une réponse depuis le JSON
function getAnswerImpactFromJSON(questionCode: string, answerCode: string): number {
  const questions = loadQuestions()
  const question = questions[questionCode]
  if (!question) return 0
  
  const option = question.options.find(opt => opt.code === answerCode)
  return option?.score_impact || 0
}

export function calculateScore(usecaseId: string, responses: any[]): UseCaseScore {
  try {
    // console.log('Starting score calculation for usecase:', usecaseId)
    // console.log('Number of responses to process:', responses?.length || 0)
    
    if (!responses) {
      responses = []
    }
    
    let currentScore = BASE_SCORE
    const breakdown: ScoreBreakdown[] = []
    
    // Initialiser les compteurs par catégorie
    const categoryData: Record<string, { 
      totalImpact: number, 
      questionCount: number, 
      maxPossibleScore: number 
    }> = {}
    
    Object.keys(RISK_CATEGORIES).forEach(categoryId => {
      categoryData[categoryId] = { 
        totalImpact: 0, 
        questionCount: 0, 
        maxPossibleScore: 0 
      }
    })

    // Charger les questions une seule fois
    const questions = loadQuestions()

    for (const response of responses) {
      // console.log('Processing response for question:', response.question_code)
      
      const question = questions[response.question_code]
      if (!question) {
        // console.log('Question not found for code:', response.question_code)
        continue
      }

      let questionImpact = 0
      let reasoning = ''

      // Calculer l'impact selon le type de réponse avec la nouvelle structure Array
      if (question.type === 'radio') {
        // Réponse unique stockée dans single_value
        const answerCode = response.single_value
        if (answerCode) {
          questionImpact = getAnswerImpactFromJSON(response.question_code, answerCode)
          reasoning = `${answerCode}: ${questionImpact} points`
        }
      } 
      else if (question.type === 'checkbox' || question.type === 'tags') {
        // Réponses multiples stockées dans multiple_codes
        const answerCodes = response.multiple_codes || []
        
        const impacts: string[] = []
        let maxImpact = 0
        
        // Pour les questions multiples, prendre le pire impact (le plus négatif)
        for (const code of answerCodes) {
          const impact = getAnswerImpactFromJSON(response.question_code, code)
          if (impact !== 0) {
            impacts.push(`${code}: ${impact}`)
            // Garder le pire impact (le plus négatif)
            if (impact < maxImpact) {
              maxImpact = impact
            }
          }
        }
        
        questionImpact = maxImpact
        reasoning = impacts.length > 0 ? 
          `${impacts.join(', ')} → Impact retenu: ${maxImpact} points (pire cas)` : 
          'Aucun impact'
      }
      else if (question.type === 'conditional' && response.conditional_main) {
        // Réponse conditionnelle stockée dans conditional_main, conditional_keys, conditional_values
        const selectedCode = response.conditional_main
        questionImpact = getAnswerImpactFromJSON(response.question_code, selectedCode)
        reasoning = `${selectedCode}: ${questionImpact} points`
      }

      // Ajouter l'impact au score total
      currentScore += questionImpact
      
      // Identifier la catégorie de risque
      const riskCategoryId = QUESTION_RISK_CATEGORY_MAPPING[response.question_code]
      
      // Ajouter au breakdown si impact non nul
      if (questionImpact !== 0) {
        // Créer une valeur de réponse formatée selon le type
        let answerValue: any = null
        if (response.single_value) {
          answerValue = response.single_value
        } else if (response.multiple_codes) {
          answerValue = response.multiple_codes
        } else if (response.conditional_main) {
          answerValue = {
            selected: response.conditional_main,
            conditionalValues: response.conditional_keys && response.conditional_values 
              ? response.conditional_keys.reduce((acc: Record<string, string>, key: string, index: number) => {
                  acc[key] = response.conditional_values[index] || ''
                  return acc
                }, {})
              : {}
          }
        }
        
        breakdown.push({
          question_id: response.question_code,
          question_text: question.question,
          answer_value: answerValue,
          score_impact: questionImpact,
          reasoning,
          risk_category: riskCategoryId
        })
        
        // Mettre à jour les données de catégorie
        if (riskCategoryId && categoryData[riskCategoryId]) {
          categoryData[riskCategoryId].totalImpact += questionImpact
          categoryData[riskCategoryId].questionCount += 1
          // Calculer le score max possible pour cette question (impact positif max)
          categoryData[riskCategoryId].maxPossibleScore += Math.max(0, Math.abs(questionImpact))
        }
      }
    }

    // S'assurer que le score ne descend pas en dessous de 0
    currentScore = Math.max(0, currentScore)

    // Calculer les scores par catégorie - toutes les catégories sont indépendantes avec le même score de base
    const categoryScores: CategoryScore[] = Object.entries(RISK_CATEGORIES).map(([categoryId, category]) => {
      const data = categoryData[categoryId]
      const baseScore = BASE_SCORE // Toutes les catégories ont le même score de base de 100
      const adjustedScore = Math.max(0, baseScore + data.totalImpact)
      
      return {
        category_id: categoryId,
        category_name: category.shortName,
        score: adjustedScore,
        max_score: baseScore,
        percentage: Math.round((adjustedScore / baseScore) * 100),
        question_count: data.questionCount,
        color: category.color,
        icon: category.icon
      }
    })

    // console.log('Final score calculated:', currentScore, '/', BASE_SCORE)
    // console.log('Breakdown entries:', breakdown.length)
    // console.log('Category scores:', categoryScores.length)

    return {
      usecase_id: usecaseId,
      score: currentScore,
      max_score: BASE_SCORE,
      score_breakdown: breakdown,
      category_scores: categoryScores,
      calculated_at: new Date().toISOString(),
      version: 1
    }
  } catch (error) {
    console.error('Error in calculateScore:', error)
    // En cas d'erreur, retourner un score par défaut
    return {
      usecase_id: usecaseId,
      score: BASE_SCORE,
      max_score: BASE_SCORE,
      score_breakdown: [],
      category_scores: [],
      calculated_at: new Date().toISOString(),
      version: 1
    }
  }
} 