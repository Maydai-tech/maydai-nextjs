import React, { useState, useEffect } from 'react'

interface ProcessingStep {
  id: string
  title: string
  description: string
  duration: number // en millisecondes
  icon: string
}

interface ProcessingAnimationProps {
  isVisible: boolean
  onComplete: () => void
}

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: 'analyzing_responses',
    title: 'Analyse des réponses',
    description: 'Traitement et validation des réponses du questionnaire',
    duration: 2000,
    icon: '📊'
  },
  {
    id: 'calculating_base_score',
    title: 'Calcul du score de base',
    description: 'Évaluation de la conformité selon les critères réglementaires',
    duration: 1500,
    icon: '🧮'
  },
  {
    id: 'calculating_principles',
    title: 'Calcul des scores principes',
    description: 'Analyse des principes de l\'IA Act (transparence, robustesse, etc.)',
    duration: 2000,
    icon: '⚖️'
  },
  {
    id: 'classifying_system',
    title: 'Classification du système d\'IA',
    description: 'Détermination du niveau de risque et de la catégorie',
    duration: 1500,
    icon: '🏷️'
  },
  {
    id: 'generating_report',
    title: 'Génération du rapport',
    description: 'Création du rapport d\'analyse personnalisé',
    duration: 3000,
    icon: '📝'
  },
  {
    id: 'writing_priorities',
    title: 'Rédaction des priorités d\'actions',
    description: 'Identification des actions réglementaires prioritaires',
    duration: 2000,
    icon: '🎯'
  },
  {
    id: 'filling_obligations',
    title: 'Renseignement des obligations spécifiques',
    description: 'Détail des obligations légales applicables',
    duration: 1500,
    icon: '📋'
  },
  {
    id: 'writing_warnings',
    title: 'Rédaction des avertissements et sanctions',
    description: 'Identification des risques et conséquences réglementaires',
    duration: 1500,
    icon: '⚠️'
  }
]

export function ProcessingAnimation({ isVisible, onComplete }: ProcessingAnimationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setCurrentStepIndex(0)
      setProgress(0)
      setIsCompleted(false)
      return
    }

    let stepStartTime = Date.now()
    let totalDuration = PROCESSING_STEPS.reduce((acc, step) => acc + step.duration, 0)
    let currentStepDuration = 0

    const updateProgress = () => {
      const now = Date.now()
      const elapsed = now - stepStartTime
      
      // Calculer le progrès de l'étape actuelle
      const stepProgress = Math.min(elapsed / PROCESSING_STEPS[currentStepIndex].duration, 1)
      
      // Calculer le progrès total
      const completedStepsProgress = currentStepIndex / PROCESSING_STEPS.length
      const currentStepProgress = stepProgress / PROCESSING_STEPS.length
      const totalProgress = (completedStepsProgress + currentStepProgress) * 100
      
      setProgress(Math.min(totalProgress, 100))

      // Passer à l'étape suivante si l'étape actuelle est terminée
      if (stepProgress >= 1 && currentStepIndex < PROCESSING_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1)
        stepStartTime = now
      } else if (stepProgress >= 1 && currentStepIndex === PROCESSING_STEPS.length - 1) {
        // Toutes les étapes sont terminées
        setIsCompleted(true)
        setTimeout(() => {
          onComplete()
        }, 1000)
      }
    }

    const interval = setInterval(updateProgress, 50) // Mise à jour toutes les 50ms pour une animation fluide

    return () => clearInterval(interval)
  }, [isVisible, currentStepIndex, onComplete])

  if (!isVisible) return null

  const currentStep = PROCESSING_STEPS[currentStepIndex]

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto">
      <div className="max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0080A3]/10 rounded-full mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#0080A3] border-t-transparent"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Analyse en cours...
          </h2>
          <p className="text-gray-600">
            Votre cas d'usage est en cours d'évaluation par notre intelligence artificielle
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm font-medium text-[#0080A3]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#0080A3] to-[#00A3CC] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                isCompleted ? 'bg-green-100' : 'bg-[#0080A3]/10'
              }`}>
                {isCompleted ? '✅' : currentStep.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                isCompleted ? 'text-green-700' : 'text-gray-900'
              }`}>
                {isCompleted ? 'Analyse terminée !' : currentStep.title}
              </h3>
              <p className={`text-sm mt-1 transition-colors duration-300 ${
                isCompleted ? 'text-green-600' : 'text-gray-600'
              }`}>
                {isCompleted ? 'Votre rapport de conformité est prêt' : currentStep.description}
              </p>
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {PROCESSING_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex && !isCompleted
            const isStepCompleted = index < currentStepIndex || (index === currentStepIndex && isCompleted)
            const isPending = index > currentStepIndex

            return (
              <div 
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive ? 'bg-[#0080A3]/5 border border-[#0080A3]/20' :
                  isStepCompleted ? 'bg-green-50 border border-green-200' :
                  'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isActive ? 'bg-[#0080A3] text-white animate-pulse' :
                  isStepCompleted ? 'bg-green-500 text-white' :
                  'bg-gray-300 text-gray-500'
                }`}>
                  {isStepCompleted ? '✓' : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    isActive ? 'text-[#0080A3]' :
                    isStepCompleted ? 'text-green-700' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                    isActive ? 'text-[#0080A3]/70' :
                    isStepCompleted ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
                {isActive && (
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0080A3] border-t-transparent"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Cette analyse peut prendre quelques minutes selon la complexité de votre cas d'usage
          </p>
        </div>
      </div>
    </div>
  )
}

