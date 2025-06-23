import { useState, useEffect, useCallback } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { QUESTIONS } from '../data/questions'
import { getNextQuestion, getQuestionProgress, getAbsoluteQuestionProgress, checkCanProceed, getPreviousQuestion, buildQuestionPath } from '../utils/questionnaire'
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
  // État local du questionnaire (les réponses temporaires avant sauvegarde)
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  
  // État des réponses sauvegardées (chargées depuis Supabase)
  const [savedAnswers, setSavedAnswers] = useState<Record<string, any>>({})
  
  // État de l'historique de navigation
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  
  // État de soumission et d'erreur
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // État initial chargé depuis Supabase
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Hook pour la communication avec Supabase
  const {
    formattedAnswers,
    saveResponse,
    saveMultiple,
    loading: loadingResponses,
    error: responseError
  } = useQuestionnaireResponses(usecaseId)

  // Charger les réponses existantes depuis Supabase au montage
  useEffect(() => {
    if (!initialDataLoaded && Object.keys(formattedAnswers).length >= 0) {
      console.log('Loading initial answers from Supabase:', formattedAnswers)
      
      // Stocker les réponses sauvegardées
      setSavedAnswers(formattedAnswers)
      
      // Initialiser les réponses locales avec les données sauvegardées
      setQuestionnaireData(prev => ({
        ...prev,
        answers: { ...formattedAnswers }
      }))
      
      setInitialDataLoaded(true)
    }
  }, [formattedAnswers, initialDataLoaded])

  // Recalculer l'historique des questions quand l'ID de la question courante change
  useEffect(() => {
    const currentPath = buildQuestionPath(questionnaireData.currentQuestionId, savedAnswers)
    setQuestionHistory(currentPath)
  }, [questionnaireData.currentQuestionId, savedAnswers])

  // Calculer les valeurs dérivées
  const currentQuestion = QUESTIONS[questionnaireData.currentQuestionId]
  const progress = getAbsoluteQuestionProgress(questionnaireData.currentQuestionId)
  const nextQuestionId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
  const isLastQuestion = nextQuestionId === null
  const currentAnswer = questionnaireData.answers[currentQuestion?.id]
  const canProceed = checkCanProceed(currentQuestion, currentAnswer)
  const canGoBack = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory) !== null

  console.log('useQuestionnaire state:', {
    currentQuestion: currentQuestion?.id,
    currentAnswer,
    savedAnswers: savedAnswers[currentQuestion?.id],
    canProceed,
    isSubmitting
  })

  // Fonction pour sauvegarder une réponse individuelle
  const saveIndividualResponse = useCallback(async (questionId: string, answer: any) => {
    const question = QUESTIONS[questionId]
    if (!question || answer === undefined || answer === null) return

    console.log('Saving response for question:', questionId, 'answer:', answer)

    try {
      if (question.type === 'radio') {
        await saveResponse(questionId, answer)
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        await saveResponse(questionId, undefined, { 
          selected_codes: answer,
          selected_labels: answer.map((code: string) => {
            const option = question.options.find(opt => opt.code === code)
            return option?.label || code
          })
        })
      } else if (question.type === 'conditional') {
        await saveResponse(questionId, undefined, answer)
      }
      
      // Mettre à jour les réponses sauvegardées localement
      setSavedAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }))
      
      console.log('Response saved successfully for question:', questionId)
    } catch (err) {
      console.error('Error saving individual response:', err)
      throw err
    }
  }, [saveResponse])

  // Gestionnaire de sélection de réponse (stockage temporaire local uniquement)
  const handleAnswerSelect = useCallback((answer: any) => {
    console.log('handleAnswerSelect called with:', answer, 'for question:', currentQuestion?.id)
    
    if (!currentQuestion) return
    
    // Mettre à jour seulement l'état local (pas de sauvegarde automatique)
    setQuestionnaireData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answer
      }
    }))
  }, [currentQuestion])

  // Fonction pour mettre à jour le statut du use case
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

  // Soumission finale du questionnaire
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      console.log('Final submission of questionnaire...')
      
      // 1. Sauvegarder toutes les réponses finales
      await saveMultiple(questionnaireData.answers)
      
      // 2. Mettre à jour le statut du use case
      await updateUsecaseStatus('completed')
      
      // 3. Marquer comme terminé
      setQuestionnaireData(prev => ({
        ...prev,
        isCompleted: true
      }))
      
      console.log('Questionnaire completed successfully!')
      
      // 4. Callback après délai
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

  // Gestionnaire du bouton "Suivant"
  const handleNext = useCallback(async () => {
    if (!currentQuestion || !canProceed) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // 1. Sauvegarder la réponse courante avant de continuer
      const currentAnswer = questionnaireData.answers[currentQuestion.id]
      if (currentAnswer !== undefined && currentAnswer !== null) {
        await saveIndividualResponse(currentQuestion.id, currentAnswer)
      }
      
      // 2. Naviguer vers la question suivante ou terminer
      if (isLastQuestion) {
        await handleSubmit()
      } else {
        setQuestionnaireData(prev => ({
          ...prev,
          currentQuestionId: nextQuestionId!
        }))
        
        // Ajouter à l'historique si pas déjà présent
        if (!questionHistory.includes(nextQuestionId!)) {
          setQuestionHistory(prev => [...prev, nextQuestionId!])
        }
      }
    } catch (err) {
      console.error('Error on next:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentQuestion, canProceed, questionnaireData.answers, isLastQuestion, nextQuestionId, questionHistory, saveIndividualResponse, handleSubmit])

  // Gestionnaire du bouton "Précédent"
  const handlePrevious = useCallback(() => {
    const previousQuestionId = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory)
    
    if (previousQuestionId) {
      // Naviguer vers la question précédente
      setQuestionnaireData(prev => ({
        ...prev,
        currentQuestionId: previousQuestionId
      }))
      
      // S'assurer que la réponse précédemment sauvegardée est chargée dans l'état local
      const savedAnswer = savedAnswers[previousQuestionId]
      if (savedAnswer !== undefined && questionnaireData.answers[previousQuestionId] === undefined) {
        setQuestionnaireData(prev => ({
          ...prev,
          answers: {
            ...prev.answers,
            [previousQuestionId]: savedAnswer
          }
        }))
      }
    }
  }, [questionnaireData.currentQuestionId, questionHistory, savedAnswers, questionnaireData.answers])

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