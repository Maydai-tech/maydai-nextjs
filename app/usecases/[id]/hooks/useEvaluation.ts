import { useState, useEffect, useCallback } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { QUESTIONS } from '../data/questions'
import { getNextQuestion, getQuestionProgress, getAbsoluteQuestionProgress, checkCanProceed, getPreviousQuestion, buildQuestionPath } from '../utils/questionnaire'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { supabase } from '@/lib/supabase'

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
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  const {
    formattedAnswers: savedAnswers,
    loading: loadingResponses,
    saveResponse,
    refreshResponses
  } = useQuestionnaireResponses(usecaseId)

  // Load initial data once
  useEffect(() => {
    if (!initialDataLoaded && !loadingResponses && savedAnswers && Object.keys(savedAnswers).length > 0) {
      console.log('🔄 Loading initial data from saved responses:', savedAnswers)
      
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
      
      setInitialDataLoaded(true)
    }
  }, [savedAnswers, loadingResponses, initialDataLoaded])

  const currentQuestion = QUESTIONS[questionnaireData.currentQuestionId]
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

  const saveIndividualResponse = async (questionId: string, answer: any) => {
    try {
      console.log(`💾 Saving response for ${questionId}:`, answer)
      
      const { error } = await supabase
        .from('questionnaire_responses')
        .upsert({
          usecase_id: usecaseId,
          question_id: questionId,
          answer: answer,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usecase_id,question_id'
        })

      if (error) {
        console.error('❌ Error saving response:', error)
        throw error
      }
      
      console.log(`✅ Successfully saved response for ${questionId}`)
      
      // Update local saved state
      await saveResponse(questionId, undefined, answer)
      
    } catch (error) {
      console.error('❌ Error in saveIndividualResponse:', error)
      throw error
    }
  }

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
        // Mark as completed in the database
        await supabase
          .from('usecases')
          .update({ status: 'completed' })
          .eq('id', usecaseId)
        
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
  }, [canProceed, isSubmitting, questionnaireData, isLastQuestion, usecaseId, onComplete])

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
    error,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit
  }
} 