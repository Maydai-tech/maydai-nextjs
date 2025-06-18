import { useState, useEffect, useCallback } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { QUESTIONS } from '../data/questions'
import { getNextQuestion, getQuestionProgress, checkCanProceed, getPreviousQuestion, buildQuestionPath } from '../utils/questionnaire'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { supabase } from '@/lib/supabase'

interface UseQuestionnaireReturn {
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

interface UseQuestionnaireProps {
  usecaseId: string
  onComplete: () => void
}

export function useQuestionnaire({ usecaseId, onComplete }: UseQuestionnaireProps): UseQuestionnaireReturn {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Utiliser le hook de stockage des réponses
  const {
    formattedAnswers,
    saveResponse,
    saveMultiple,
    loading: loadingResponses,
    error: responseError
  } = useQuestionnaireResponses(usecaseId)

  // Charger les réponses existantes au montage
  useEffect(() => {
    if (Object.keys(formattedAnswers).length > 0) {
      setQuestionnaireData(prev => {
        // Éviter la mise à jour si les réponses sont identiques
        const answersChanged = JSON.stringify(prev.answers) !== JSON.stringify(formattedAnswers)
        if (answersChanged) {
          return {
            ...prev,
            answers: formattedAnswers
          }
        }
        return prev
      })
    }
  }, [formattedAnswers])

  // Reconstruire l'historique des questions uniquement quand l'ID de la question courante change
  useEffect(() => {
    const currentPath = buildQuestionPath(questionnaireData.currentQuestionId, questionnaireData.answers)
    setQuestionHistory(currentPath)
  }, [questionnaireData.currentQuestionId])

  const currentQuestion = QUESTIONS[questionnaireData.currentQuestionId]
  const progress = getQuestionProgress(questionnaireData.currentQuestionId, questionnaireData.answers)
  const nextQuestionId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
  const isLastQuestion = nextQuestionId === null
  const canProceed = checkCanProceed(currentQuestion, questionnaireData.answers[currentQuestion?.id])
  const canGoBack = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory) !== null

  // Fonction pour sauvegarder une réponse individuelle avec les codes appropriés
  const saveIndividualResponse = useCallback(async (questionId: string, answer: any) => {
    const question = QUESTIONS[questionId]
    if (!question) return

    try {
      if (question.type === 'radio') {
        // Pour les boutons radio, la réponse est déjà un code
        await saveResponse(questionId, answer)
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        // Pour les checkboxes/tags, les réponses sont déjà des codes
        await saveResponse(questionId, undefined, { 
          selected_codes: answer,
          selected_labels: answer.map((code: string) => {
            const option = question.options.find(opt => opt.code === code)
            return option?.label || code
          })
        })
      } else if (question.type === 'conditional') {
        // Pour les questions conditionnelles, sauvegarder la structure complète
        await saveResponse(questionId, undefined, answer)
      }
    } catch (err) {
      console.error('Error saving individual response:', err)
      // Ne pas bloquer l'utilisateur en cas d'erreur de sauvegarde individuelle
    }
  }, [saveResponse])

  const handleAnswerSelect = useCallback(async (answer: any) => {
    // Mettre à jour l'état local immédiatement
    setQuestionnaireData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answer
      }
    }))

    // Sauvegarder la réponse automatiquement
    await saveIndividualResponse(currentQuestion.id, answer)
  }, [currentQuestion.id, saveIndividualResponse])

  const updateUsecaseStatus = useCallback(async (status: string) => {
    try {
      const { error } = await supabase
        .from('usecases')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', usecaseId)

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Error updating usecase status:', err)
      throw new Error('Failed to update questionnaire status')
    }
  }, [usecaseId])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      // 1. Sauvegarder toutes les réponses dans Supabase (au cas où certaines n'auraient pas été sauvegardées)
      console.log('Final save of all questionnaire responses...')
      await saveMultiple(questionnaireData.answers)
      
      // 2. Marquer le use case comme completed
      console.log('Updating usecase status to completed...')
      await updateUsecaseStatus('completed')
      
      // 3. Marquer le questionnaire comme terminé localement
      setQuestionnaireData(prev => ({
        ...prev,
        isCompleted: true
      }))
      
      console.log('Questionnaire completed successfully!')
      
      // 4. Appeler le callback de completion après un délai
      setTimeout(() => {
        onComplete()
      }, 2000)
      
    } catch (err) {
      console.error('Error submitting questionnaire:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la soumission du questionnaire')
    } finally {
      setIsSubmitting(false)
    }
  }, [questionnaireData.answers, saveMultiple, updateUsecaseStatus, onComplete])

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      handleSubmit()
    } else {
      setQuestionnaireData(prev => ({
        ...prev,
        currentQuestionId: nextQuestionId!
      }))
      
      // Ajouter la nouvelle question à l'historique si elle n'y est pas déjà
      if (!questionHistory.includes(nextQuestionId!)) {
        setQuestionHistory(prev => [...prev, nextQuestionId!])
      }
    }
  }, [isLastQuestion, nextQuestionId, questionHistory, handleSubmit])

  const handlePrevious = useCallback(() => {
    const previousQuestionId = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory)
    
    if (previousQuestionId) {
      setQuestionnaireData(prev => ({
        ...prev,
        currentQuestionId: previousQuestionId
      }))
    }
  }, [questionnaireData.currentQuestionId, questionHistory])

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
    error: error || responseError,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit
  }
} 