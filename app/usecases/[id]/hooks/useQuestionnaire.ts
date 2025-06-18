import { useState, useEffect } from 'react'
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
      setQuestionnaireData(prev => ({
        ...prev,
        answers: formattedAnswers
      }))
    }
  }, [formattedAnswers])

  // Reconstruire l'historique des questions quand les réponses changent
  useEffect(() => {
    const currentPath = buildQuestionPath(questionnaireData.currentQuestionId, questionnaireData.answers)
    setQuestionHistory(currentPath)
  }, [questionnaireData.currentQuestionId, questionnaireData.answers])

  const currentQuestion = QUESTIONS[questionnaireData.currentQuestionId]
  const progress = getQuestionProgress(questionnaireData.currentQuestionId, questionnaireData.answers)
  const nextQuestionId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
  const isLastQuestion = nextQuestionId === null
  const canProceed = checkCanProceed(currentQuestion, questionnaireData.answers[currentQuestion?.id])
  const canGoBack = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory) !== null

  // Fonction pour sauvegarder une réponse individuelle avec les codes appropriés
  const saveIndividualResponse = async (questionId: string, answer: any) => {
    const question = QUESTIONS[questionId]
    if (!question) return

    try {
      if (question.type === 'radio') {
        // Pour les boutons radio, sauvegarder le code de l'option sélectionnée
        const selectedOption = question.options.find(opt => opt.label === answer)
        if (selectedOption) {
          await saveResponse(questionId, selectedOption.code)
        }
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        // Pour les checkboxes/tags, sauvegarder les codes des options sélectionnées
        const selectedCodes = answer.map((selectedLabel: string) => {
          const option = question.options.find(opt => opt.label === selectedLabel)
          return option?.code
        }).filter(Boolean)
        
        await saveResponse(questionId, undefined, { 
          selected_codes: selectedCodes, 
          selected_labels: answer 
        })
      } else if (question.type === 'conditional') {
        // Pour les questions conditionnelles, sauvegarder la structure complète
        await saveResponse(questionId, undefined, answer)
      }
    } catch (err) {
      console.error('Error saving individual response:', err)
      // Ne pas bloquer l'utilisateur en cas d'erreur de sauvegarde individuelle
    }
  }

  const handleAnswerSelect = async (answer: any) => {
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
  }

  const handleNext = () => {
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
  }

  const handlePrevious = () => {
    const previousQuestionId = getPreviousQuestion(questionnaireData.currentQuestionId, questionHistory)
    
    if (previousQuestionId) {
      setQuestionnaireData(prev => ({
        ...prev,
        currentQuestionId: previousQuestionId
      }))
    }
  }

  const updateUsecaseStatus = async (status: string) => {
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
  }

  const handleSubmit = async () => {
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
    error: error || responseError,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit
  }
} 