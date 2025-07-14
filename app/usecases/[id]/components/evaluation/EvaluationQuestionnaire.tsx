import React, { useState, useEffect } from 'react'
import { UseCase } from '../../types/usecase'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { loadQuestions, getAllQuestions } from '../../utils/questions-loader'
import { QuestionRenderer } from './QuestionRenderer'
import { CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Edit3, Eye, X } from 'lucide-react'

interface EvaluationQuestionnaireProps {
  useCase: UseCase
  onComplete: () => void
  isReadOnly?: boolean
}

interface QuestionEditModalProps {
  question: any
  currentAnswer: any
  isOpen: boolean
  onClose: () => void
  onSave: (answer: any) => void
}

function QuestionEditModal({ question, currentAnswer, isOpen, onClose, onSave }: QuestionEditModalProps) {
  const [tempAnswer, setTempAnswer] = useState(currentAnswer)

  useEffect(() => {
    setTempAnswer(currentAnswer)
  }, [currentAnswer, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(tempAnswer)
    onClose()
  }

  const formatAnswerLabel = (answer: any) => {
    if (!answer) return 'Non répondu'
    
    if (typeof answer === 'string') {
      const option = question.options?.find((opt: any) => opt.code === answer)
      return option?.label || answer
    }
    
    if (Array.isArray(answer)) {
      return answer.map(code => {
        const option = question.options?.find((opt: any) => opt.code === code)
        return option?.label || code
      }).join(', ')
    }
    
    if (typeof answer === 'object' && answer.selected) {
      const option = question.options?.find((opt: any) => opt.code === answer.selected)
      let result = option?.label || answer.selected
      if (answer.conditionalValues) {
        const details = Object.values(answer.conditionalValues).filter(Boolean).join(', ')
        if (details) result += ` (${details})`
      }
      return result
    }
    
    return JSON.stringify(answer)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Modifier la réponse
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">
              {question.question}
            </h4>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Réponse actuelle :</p>
              <p className="text-sm font-medium text-gray-900">
                {formatAnswerLabel(currentAnswer)}
              </p>
            </div>
          </div>
          
          <QuestionRenderer
            question={question}
            currentAnswer={tempAnswer}
            onAnswerChange={setTempAnswer}
            isReadOnly={false}
          />
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors cursor-pointer"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  )
}

export const EvaluationQuestionnaire = React.memo(function EvaluationQuestionnaire({ useCase, onComplete, isReadOnly = false }: EvaluationQuestionnaireProps) {
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const {
    formattedAnswers,
    saveResponse,
    loading: loadingResponses
  } = useQuestionnaireResponses(useCase.id)

  const isCompletedStatus = useCase.status?.toLowerCase() === 'completed'
  const isDraftStatus = useCase.status?.toLowerCase() === 'draft'

  // Obtenir toutes les questions dans l'ordre logique
  const getOrderedQuestions = () => {
    return getAllQuestions() // Utilise la fonction du questions-loader qui trie déjà par ID
  }

  const formatAnswerDisplay = (question: any, answer: any) => {
    if (!answer) return { text: 'Non répondu', className: 'text-gray-500 italic' }
    
    if (typeof answer === 'string') {
      const option = question.options?.find((opt: any) => opt.code === answer)
      return { 
        text: option?.label || answer, 
        className: 'text-gray-900' 
      }
    }
    
    if (Array.isArray(answer)) {
      if (answer.length === 0) {
        return { text: 'Aucune sélection', className: 'text-gray-500 italic' }
      }
      const labels = answer.map(code => {
        const option = question.options?.find((opt: any) => opt.code === code)
        return option?.label || code
      })
      return { 
        text: labels.join(', '), 
        className: 'text-gray-900' 
      }
    }
    
    if (typeof answer === 'object' && answer.selected) {
      const option = question.options?.find((opt: any) => opt.code === answer.selected)
      let result = option?.label || answer.selected
      if (answer.conditionalValues) {
        const details = Object.values(answer.conditionalValues).filter(Boolean).join(', ')
        if (details) result += ` (${details})`
      }
      return { 
        text: result, 
        className: 'text-gray-900' 
      }
    }
    
    return { text: JSON.stringify(answer), className: 'text-gray-900' }
  }

  const handleSaveAnswer = async (questionId: string, answer: any) => {
    try {
      const questions = loadQuestions()
      const question = questions[questionId]
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
    } catch (error) {
      console.error('Error saving answer:', error)
    }
  }

  const questions = getOrderedQuestions()
  const loadedQuestions = loadQuestions()
  const currentQuestion = editingQuestion ? loadedQuestions[editingQuestion] : null

  if (loadingResponses) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Évaluation du cas d'usage
            </h2>
          </div>
          
          {isCompletedStatus && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Eye className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-blue-800 text-sm font-medium">Questionnaire complété</p>
                  <p className="text-blue-600 text-sm">Cliquez sur "Modifier" pour changer une réponse.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => {
            const answer = formattedAnswers[question.id]
            const displayAnswer = formatAnswerDisplay(question, answer)
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {question.question}
                      </h3>
                    </div>
                    <div className="ml-12">
                      <p className={`text-sm ${displayAnswer.className}`}>
                        {displayAnswer.text}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingQuestion(question.id)}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-[#0080A3] bg-[#0080A3]/10 rounded-lg hover:bg-[#0080A3]/20 transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Modifier
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <QuestionEditModal
        question={currentQuestion}
        currentAnswer={formattedAnswers[editingQuestion || '']}
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSave={(answer) => {
          if (editingQuestion) {
            handleSaveAnswer(editingQuestion, answer)
          }
        }}
      />
    </>
  )
}) 