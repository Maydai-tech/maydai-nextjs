import { useState } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { QUESTIONS } from '../data/questions'
import { getNextQuestion, getQuestionProgress, checkCanProceed } from '../utils/questionnaire'

interface UseQuestionnaireReturn {
  questionnaireData: QuestionnaireData
  currentQuestion: any
  progress: any
  nextQuestionId: string | null
  isLastQuestion: boolean
  canProceed: boolean
  isSubmitting: boolean
  isCompleted: boolean
  handleAnswerSelect: (answer: any) => void
  handleNext: () => void
  handlePrevious: () => void
  handleSubmit: () => Promise<void>
}

export function useQuestionnaire(onComplete: () => void): UseQuestionnaireReturn {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentQuestion = QUESTIONS[questionnaireData.currentQuestionId]
  const progress = getQuestionProgress(questionnaireData.currentQuestionId, questionnaireData.answers)
  const nextQuestionId = getNextQuestion(questionnaireData.currentQuestionId, questionnaireData.answers)
  const isLastQuestion = nextQuestionId === null
  const canProceed = checkCanProceed(currentQuestion, questionnaireData.answers[currentQuestion?.id])

  const handleAnswerSelect = (answer: any) => {
    setQuestionnaireData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: answer
      }
    }))
  }

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit()
    } else {
      setQuestionnaireData(prev => ({
        ...prev,
        currentQuestionId: nextQuestionId!
      }))
    }
  }

  const handlePrevious = () => {
    // This would need a more complex implementation to track question history
    // For now, we'll keep it simple
    console.log('Previous functionality not implemented yet')
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Here you would typically save the answers to your backend
      console.log('Questionnaire completed:', questionnaireData.answers)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setQuestionnaireData(prev => ({
        ...prev,
        isCompleted: true
      }))
      
      // Call the completion callback
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (error) {
      console.error('Error submitting questionnaire:', error)
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
    isSubmitting,
    isCompleted: questionnaireData.isCompleted,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit
  }
} 