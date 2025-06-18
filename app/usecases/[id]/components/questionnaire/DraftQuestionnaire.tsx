import React from 'react'
import { UseCase } from '../../types/usecase'
import { useQuestionnaire } from '../../hooks/useQuestionnaire'
import { QuestionRenderer } from './QuestionRenderer'
import { CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

interface DraftQuestionnaireProps {
  useCase: UseCase
  onComplete: () => void
}

export function DraftQuestionnaire({ useCase, onComplete }: DraftQuestionnaireProps) {
  const {
    currentQuestion,
    progress,
    isLastQuestion,
    canProceed,
    canGoBack,
    isSubmitting,
    isCompleted,
    error,
    questionnaireData,
    handleAnswerSelect,
    handleNext,
    handlePrevious
  } = useQuestionnaire({
    usecaseId: useCase.id,
    onComplete
  })

  if (isCompleted) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Questionnaire complété !
          </h3>
          <p className="text-gray-600 mb-4">
            Merci d'avoir répondu aux questions. Votre cas d'usage a été sauvegardé et évalué.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3] mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Évaluation du cas d'usage
          </h2>
          <span className="text-sm text-gray-500">
            {progress.current} / {progress.total}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-[#0080A3] h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progress.percentage}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {currentQuestion && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion.question}
            </h3>
            
            <QuestionRenderer
              question={currentQuestion}
              currentAnswer={questionnaireData.answers[currentQuestion.id]}
              onAnswerChange={handleAnswerSelect}
            />
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={!canGoBack}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !canGoBack
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Précédent
            </button>
            
            <button
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
              className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                canProceed && !isSubmitting
                  ? 'bg-[#0080A3] text-white hover:bg-[#006280]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isLastQuestion ? 'Sauvegarde...' : 'Envoi...'}
                </>
              ) : (
                <>
                  {isLastQuestion ? 'Terminer' : 'Suivant'}
                  {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-2" />}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 