import { useState, useEffect, useCallback } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { loadQuestions } from '../utils/questions-loader'
import { getNextQuestion, getQuestionProgress, getAbsoluteQuestionProgress, checkCanProceed, getPreviousQuestion, buildQuestionPath } from '../utils/questionnaire'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { supabase } from '@/lib/supabase'
import { ScoreService } from '@/lib/score-service'
import { useAuth } from '@/lib/auth'

interface UseEvaluationReturn {
  questionnaireData: QuestionnaireData
  currentQuestion: any
  progress: any
  nextQuestionId: string | null
  isLastQuestion: boolean
  canProceed: boolean
  canGoBack: boolean
  isSubmitting: boolean
  isCompleted: boolean
  isCalculatingScore: boolean
  error: string | null
  handleAnswerSelect: (answer: any) => void
  handleNext: () => void
  handlePrevious: () => void
  handleSubmit: () => Promise<void>
}

interface UseEvaluationProps {
  usecaseId: string
  onComplete: () => void
}

export function useEvaluation({ usecaseId, onComplete }: UseEvaluationProps): UseEvaluationReturn {
  const { session } = useAuth()
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)

  const {
    formattedAnswers: savedAnswers,
    loading: loadingResponses,
    saveResponse,
    refreshResponses
  } = useQuestionnaireResponses(usecaseId)

  // Load initial data once
  useEffect(() => {
    if (!initialDataLoaded && !loadingResponses) {
      console.log('🔄 Loading initial data from saved responses:', savedAnswers)
      
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        // Load saved answers
        setQuestionnaireData(prev => ({
          ...prev,
          answers: { ...savedAnswers }
        }))
        
        // Find the correct current question based on saved answers
        const questionPath = buildQuestionPath('E4.N7.Q1', savedAnswers)
        let currentQuestionId = 'E4.N7.Q1'
        
        // Find the first unanswered question
        for (const questionId of questionPath) {
          if (!savedAnswers[questionId] || 
              (Array.isArray(savedAnswers[questionId]) && savedAnswers[questionId].length === 0)) {
            currentQuestionId = questionId
            break
          }
          currentQuestionId = getNextQuestion(questionId, savedAnswers) || questionId
        }
        
        console.log('📍 Setting current question to:', currentQuestionId)
        
        setQuestionnaireData(prev => ({
          ...prev,
          currentQuestionId
        }))
        
        // Build history up to current question
        const historyPath = buildQuestionPath(currentQuestionId, savedAnswers)
        setQuestionHistory(historyPath)
      } else {
        console.log('📍 No saved responses, starting from first question')
        // No saved responses, start from the beginning
        setQuestionnaireData(prev => ({
          ...prev,
          currentQuestionId: 'E4.N7.Q1',
          answers: {}
        }))
        setQuestionHistory(['E4.N7.Q1'])
      }
      
      setInitialDataLoaded(true)
    }
  }, [savedAnswers, loadingResponses, initialDataLoaded])

  const questions = loadQuestions()
  const currentQuestion = questions[questionnaireData.currentQuestionId]
  const nextQuestionId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
  const isLastQuestion = nextQuestionId === null
  const canProceed = checkCanProceed(currentQuestion, questionnaireData.answers[questionnaireData.currentQuestionId])
  const canGoBack = questionHistory.length > 1

  // Progress basé sur le parcours total absolu possible
  const progress = getAbsoluteQuestionProgress(questionnaireData.currentQuestionId)

  const handleAnswerSelect = useCallback((answer: any) => {
    console.log(`📝 Answer selected for ${questionnaireData.currentQuestionId}:`, answer)
    
    setQuestionnaireData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionnaireData.currentQuestionId]: answer
      }
    }))
    
    setError(null)
  }, [questionnaireData.currentQuestionId])

  const saveIndividualResponse = useCallback(async (questionId: string, answer: any) => {
    try {
      console.log(`💾 Saving response for ${questionId}:`, answer)
      
      // Use the proper saveResponse method from useQuestionnaireResponses
      const questions = loadQuestions()
      const question = questions[questionId]
      if (!question) {
        throw new Error(`Question not found: ${questionId}`)
      }

      if (question.type === 'radio') {
        await saveResponse(questionId, answer)
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        await saveResponse(questionId, undefined, { 
          selected_codes: answer,
          selected_labels: answer?.map((code: string) => {
            const option = question.options.find(opt => opt.code === code)
            return option?.label || code
          }) || []
        })
      } else if (question.type === 'conditional') {
        await saveResponse(questionId, undefined, answer)
      } else {
        // Fallback for other types
        await saveResponse(questionId, undefined, answer)
      }
      
      console.log(`✅ Successfully saved response for ${questionId}`)
      
    } catch (error) {
      console.error('❌ Error in saveIndividualResponse:', error)
      throw error
    }
  }, [saveResponse])

  const handleNext = useCallback(async () => {
    if (!canProceed || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const currentAnswer = questionnaireData.answers[questionnaireData.currentQuestionId]
      
      // Save current response
      await saveIndividualResponse(questionnaireData.currentQuestionId, currentAnswer)

      if (isLastQuestion) {
        // Complete questionnaire
        console.log('🏁 Completing questionnaire')
        
        // Calculate score using API
        console.log('🧮 Calculating use case score...')
        setIsCalculatingScore(true)
        
        try {
          if (!session?.access_token) {
            throw new Error('Token d\'authentification manquant')
          }
          
          // Create ScoreService instance with authentication token
          const scoreService = new ScoreService(session.access_token)
          const scoreResult = await scoreService.calculateUseCaseScore(usecaseId)
          console.log('✅ Score calculated successfully:', scoreResult)
        } catch (scoreError) {
          console.error('❌ Error calculating score:', scoreError)
          // Continue with completion even if score calculation fails
        } finally {
          setIsCalculatingScore(false)
        }
        
        // Mark as completed in the database
        await supabase
          .from('usecases')
          .update({ status: 'completed' })
          .eq('id', usecaseId)

        // Generate OpenAI report automatically after questionnaire completion
        console.log('🤖 Generating OpenAI report automatically...')
        try {
          const reportResponse = await fetch('/api/generate-report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ usecase_id: usecaseId })
          })
          
          if (reportResponse.ok) {
            console.log('✅ OpenAI report generated successfully')
          } else {
            const errorData = await reportResponse.json()
            if (errorData.requires_questionnaire) {
              console.log('ℹ️ Questionnaire incomplet, rapport non généré')
            } else {
              console.warn('⚠️ OpenAI report generation failed, but continuing...')
            }
          }
        } catch (reportError) {
          console.error('❌ Error generating OpenAI report:', reportError)
          // Continue with completion even if report generation fails
        }
        
        setQuestionnaireData(prev => ({ ...prev, isCompleted: true }))
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        // Move to next question
        const nextId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
        if (nextId) {
          console.log(`➡️ Moving to next question: ${nextId}`)
          
          setQuestionnaireData(prev => ({
            ...prev,
            currentQuestionId: nextId
          }))
          
          setQuestionHistory(prev => [...prev, nextId])
        }
      }
    } catch (error) {
      console.error('❌ Error handling next:', error)
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }, [canProceed, isSubmitting, questionnaireData.currentQuestionId, questionnaireData.answers, isLastQuestion, usecaseId, onComplete, saveIndividualResponse])

  const handlePrevious = useCallback(() => {
    if (!canGoBack) return

    const newHistory = [...questionHistory]
    newHistory.pop() // Remove current question
    const previousQuestionId = newHistory[newHistory.length - 1]
    
    console.log(`⬅️ Going back to: ${previousQuestionId}`)
    
    setQuestionnaireData(prev => ({
      ...prev,
      currentQuestionId: previousQuestionId
    }))
    
    setQuestionHistory(newHistory)
    setError(null)
  }, [canGoBack, questionHistory])

  const handleSubmit = async () => {
    if (!canProceed) return
    await handleNext()
  }

  return {
    questionnaireData,
    currentQuestion,
    progress,
    nextQuestionId,
    isLastQuestion,
    canProceed,
    canGoBack,
    isSubmitting,
    isCompleted: questionnaireData.isCompleted,
    isCalculatingScore,
    error,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit
  }
} 