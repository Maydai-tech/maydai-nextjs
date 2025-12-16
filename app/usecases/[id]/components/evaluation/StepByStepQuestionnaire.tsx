import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UseCase } from '../../types/usecase'
import { useEvaluation } from '../../hooks/useEvaluation'
import { QuestionRenderer } from './QuestionRenderer'
import { ProcessingAnimation } from '../ProcessingAnimation'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react'
import Tooltip from '@/components/Tooltip'
import { useAuth } from '@/lib/auth'
import { useCompanyInfo } from '../../hooks/useCompanyInfo'
import { useCaseRoutes } from '../../utils/routes'
import InviteScopeChoiceModal from '@/components/Collaboration/InviteScopeChoiceModal'
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal'

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
  // Auth et informations de la company pour la collaboration
  const { session } = useAuth()
  const { isOwner } = useCompanyInfo(useCase.company_id)

  // État pour le nom de la company
  const [companyName, setCompanyName] = useState<string | null>(
    useCase.companies?.name || null
  )

  // États pour les modals de collaboration
  const [isScopeChoiceModalOpen, setIsScopeChoiceModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteScope, setInviteScope] = useState<'company' | 'registry'>('registry')

  // Récupérer le nom de la company si non disponible dans useCase.companies
  useEffect(() => {
    if (!companyName && useCase.company_id && session?.access_token) {
      const fetchCompanyName = async () => {
        try {
          const response = await fetch(`/api/companies/${useCase.company_id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            setCompanyName(data.name || null)
          }
        } catch (error) {
          console.warn('Error fetching company name:', error)
        }
      }
      fetchCompanyName()
    }
  }, [companyName, useCase.company_id, session?.access_token])

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

  // Handlers pour la collaboration
  const handleInviteClick = () => {
    setIsScopeChoiceModalOpen(true)
  }

  const handleScopeSelect = (scope: 'company' | 'registry') => {
    setInviteScope(scope)
    setIsScopeChoiceModalOpen(false)
    setIsInviteModalOpen(true)
  }

  const handleInvite = async (data: { email: string; firstName: string; lastName: string }) => {
    if (!session?.access_token) {
      throw new Error('Non authentifié')
    }

    const endpoint = inviteScope === 'company'
      ? '/api/collaboration/profile'
      : `/api/companies/${useCase.company_id}/collaborators`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de l\'invitation')
    }
  }

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
        {/* Header avec navigation et informations du cas d'usage */}
        <div className="text-center mb-8">
          <Link
            href={useCaseRoutes.dashboard(useCase.company_id)}
            className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Retour au dashboard</span>
          </Link>

          <div className="flex items-center justify-center mb-4">
            <div className="bg-[#0080A3]/10 p-3 rounded-lg">
              <Image
                src="/icons_dash/technology.png"
                alt="Icône technologie"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
            {useCase.name || "Nouveau cas d'usage IA"}
          </h1>
          <p className="text-gray-600">
            Registre : {companyName || 'Chargement...'}
          </p>
        </div>

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

        {/* Barre de navigation avec boutons Précédent/Inviter/Suivant */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 pt-6 border-t border-gray-200">
          {/* Bouton Précédent */}
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </button>

          {/* Bouton Inviter un collaborateur - visible uniquement pour les owners */}
          {isOwner && (
            <button
              onClick={handleInviteClick}
              className="group inline-flex items-center justify-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2"
              title="Inviter un collaborateur"
            >
              <UserPlus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium">Inviter un collaborateur</span>
            </button>
          )}

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

      {/* Modal de choix du scope d'invitation */}
      <InviteScopeChoiceModal
        isOpen={isScopeChoiceModalOpen}
        onClose={() => setIsScopeChoiceModalOpen(false)}
        onSelectScope={handleScopeSelect}
      />

      {/* Modal d'invitation de collaborateur */}
      <InviteCollaboratorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        scope={inviteScope}
      />
    </>
  )
} 