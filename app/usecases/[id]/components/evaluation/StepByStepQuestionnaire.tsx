import React from 'react'
import { UseCase } from '../../types/usecase'
import { useEvaluation } from '../../hooks/useEvaluation'
import { QuestionRenderer } from './QuestionRenderer'
import { ProcessingAnimation } from '../ProcessingAnimation'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import Tooltip from '@/components/Tooltip'

/**
 * Interface définissant les props du composant StepByStepQuestionnaire
 */
interface StepByStepQuestionnaireProps {
  /** Le cas d'usage pour lequel on effectue l'évaluation */
  useCase: UseCase
  /** Fonction appelée quand le questionnaire est terminé */
  onComplete: () => void
}

/**
 * Composant principal du questionnaire étape par étape pour l'évaluation des cas d'usage.
 * Gère la navigation entre les questions, la sauvegarde des réponses, et l'affichage du progrès.
 * 
 * @param useCase - Le cas d'usage à évaluer
 * @param onComplete - Callback appelé à la fin du questionnaire
 */
export function StepByStepQuestionnaire({ useCase, onComplete }: StepByStepQuestionnaireProps) {
  // Hook personnalisé qui gère toute la logique d'évaluation
  const {
    questionnaireData,     // Données du questionnaire et réponses actuelles
    currentQuestion,       // Question actuellement affichée
    progress,             // Informations sur la progression (pourcentage, étape)
    nextQuestionId,       // ID de la prochaine question (pour la navigation conditionnelle)
    isLastQuestion,       // Indique si on est à la dernière question
    canProceed,          // Indique si on peut passer à la suite (réponse valide)
    canGoBack,           // Indique si on peut revenir en arrière
    isSubmitting,        // Indique si une sauvegarde est en cours
    isCompleted,         // Indique si le questionnaire est terminé
    isCalculatingScore,  // Indique si le calcul du score est en cours
    isGeneratingReport,  // Indique si la génération du rapport est en cours
    showProcessingAnimation, // Contrôle l'affichage de l'animation de traitement
    error,               // Message d'erreur éventuel
    handleAnswerSelect,  // Fonction pour sélectionner une réponse
    handleNext,          // Fonction pour passer à la question suivante
    handlePrevious,      // Fonction pour revenir à la question précédente
    handleSubmit,        // Fonction pour soumettre le questionnaire complet
    handleProcessingComplete // Fonction appelée à la fin du traitement
  } = useEvaluation({
    usecaseId: useCase.id,
    onComplete
  })

  // État de fin : questionnaire terminé avec succès
  if (isCompleted) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
        <div className="mb-6">
          {/* Icône de succès */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          {/* Message de confirmation */}
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

  // État de chargement : en attente de la première question
  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        {/* Animation de chargement avec skeleton */}
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // Interface principale du questionnaire
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="text-gray-700 font-medium">Progression</span>
            <span className="text-[#0080A3] font-medium">{progress.percentage}%</span>
          </div>
          {/* Barre de progression visuelle avec animation */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#0080A3] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Message d'erreur (affiché conditionnellement) */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Section question principale */}
        <div className="mb-8">
          {/* Titre de la question avec infobulle */}
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentQuestion.question}
            </h2>
            {currentQuestion.tooltip && (
              <Tooltip 
                title={currentQuestion.tooltip.title}
                shortContent={currentQuestion.tooltip.shortContent}
                fullContent={currentQuestion.tooltip.fullContent}
                icon={currentQuestion.tooltip.icon}
                type="question"
              />
            )}
          </div>
          
          {/* Composant de rendu de la question (gère différents types de questions) */}
          <QuestionRenderer
            question={currentQuestion}
            currentAnswer={questionnaireData.answers[currentQuestion.id]}
            onAnswerChange={handleAnswerSelect}
            isReadOnly={false}
          />
        </div>

        {/* Barre de navigation avec boutons Précédent/Suivant */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          {/* Bouton Précédent */}
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

          {/* Conteneur pour les boutons d'action (Suivant/Terminer) */}
          <div className="flex space-x-3">
            {/* Bouton conditionnel : Terminer ou Suivant selon la position */}
            {isLastQuestion ? (
              /* Bouton Terminer (dernière question) */
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
                    {/* Animation de chargement avec message dynamique */}
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
              /* Bouton Suivant (questions intermédiaires) */
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
                    {/* Animation de sauvegarde */}
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

      {/* Animation de traitement (calcul du score et génération du rapport) */}
      <ProcessingAnimation 
        isVisible={showProcessingAnimation}
        onComplete={handleProcessingComplete}
      />
    </>
  )
} 