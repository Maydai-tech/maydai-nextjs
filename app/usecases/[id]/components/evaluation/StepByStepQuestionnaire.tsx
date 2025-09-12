import React from 'react'
import { UseCase } from '../../types/usecase'
import { useEvaluation } from '../../hooks/useEvaluation'
import { QuestionRenderer } from './QuestionRenderer'
import { ProcessingAnimation } from '../ProcessingAnimation'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'

interface StepByStepQuestionnaireProps {
  useCase: UseCase
  onComplete: () => void
}

export function StepByStepQuestionnaire({ useCase, onComplete }: StepByStepQuestionnaireProps) {
  const {
    questionnaireData,
    currentQuestion,
    progress,
    nextQuestionId,
    isLastQuestion,
    canProceed,
    canGoBack,
    isSubmitting,
    isCompleted,
    isCalculatingScore,
    isGeneratingReport,
    showProcessingAnimation,
    error,
    handleAnswerSelect,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleProcessingComplete
  } = useEvaluation({
    usecaseId: useCase.id,
    onComplete
  })

  if (isCompleted) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Questionnaire terminé !
          </h2>
          <p className="text-gray-600">
            Votre évaluation a été sauvegardée avec succès et le score de votre use case a été calculé.
          </p>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#0080A3] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>
          
          <QuestionRenderer
            question={currentQuestion}
            currentAnswer={questionnaireData.answers[currentQuestion.id]}
            onAnswerChange={handleAnswerSelect}
            isReadOnly={false}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </button>

          <div className="flex space-x-3">
            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
                className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  canProceed && !isSubmitting
                    ? 'text-white bg-green-600 hover:bg-green-700'
                    : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    {isCalculatingScore ? 'Calcul du score...' : 'Finalisation...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Terminer l'évaluation
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  canProceed && !isSubmitting
                    ? 'text-white bg-[#0080A3] hover:bg-[#006280]'
                    : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing Animation */}
      <ProcessingAnimation 
        isVisible={showProcessingAnimation}
        onComplete={handleProcessingComplete}
      />
    </>
  )
} 