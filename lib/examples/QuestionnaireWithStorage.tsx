import React, { useState, useEffect } from 'react'
import { useQuestionnaireResponses } from '../hooks/useQuestionnaireResponses'
import { QUESTIONS } from '../../app/usecases/[id]/data/questions'
import { Question } from '../../app/usecases/[id]/types/usecase'

interface QuestionnaireWithStorageProps {
  usecaseId: string
}

export default function QuestionnaireWithStorage({ usecaseId }: QuestionnaireWithStorageProps) {
  const {
    formattedAnswers,
    loading,
    saving,
    error,
    saveResponse,
    saveMultiple,
    hasResponse
  } = useQuestionnaireResponses(usecaseId)

  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({})

  // Charger les réponses sauvegardées quand elles sont disponibles
  useEffect(() => {
    if (Object.keys(formattedAnswers).length > 0) {
      setCurrentAnswers(formattedAnswers)
    }
  }, [formattedAnswers])

  // Gérer les changements de réponse
  const handleAnswerChange = async (questionId: string, answer: any) => {
    // Mettre à jour l'état local immédiatement
    setCurrentAnswers(prev => ({ ...prev, [questionId]: answer }))

    // Trouver les codes de réponse pour cette question
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
        
        await saveResponse(questionId, undefined, { selected_codes: selectedCodes, selected_labels: answer })
      } else if (question.type === 'conditional') {
        // Pour les questions conditionnelles, sauvegarder la structure complète
        await saveResponse(questionId, undefined, answer)
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err)
      // Optionnel : afficher un message d'erreur à l'utilisateur
    }
  }

  // Sauvegarder toutes les réponses à la fois
  const handleSaveAll = async () => {
    try {
      await saveMultiple(currentAnswers)
      alert('Toutes les réponses ont été sauvegardées !')
    } catch (err) {
      alert('Erreur lors de la sauvegarde')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Chargement des réponses...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Questionnaire de Conformité</h1>
        <div className="flex items-center space-x-4">
          {saving && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Sauvegarde...
            </div>
          )}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Sauvegarder tout
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(QUESTIONS).map(([questionId, question]) => (
          <QuestionCard
            key={questionId}
            question={question}
            answer={currentAnswers[questionId]}
            onAnswerChange={(answer) => handleAnswerChange(questionId, answer)}
            hasExistingResponse={hasResponse(questionId)}
          />
        ))}
      </div>
    </div>
  )
}

// Composant pour afficher une question individuelle
interface QuestionCardProps {
  question: Question
  answer: any
  onAnswerChange: (answer: any) => void
  hasExistingResponse: boolean
}

function QuestionCard({ question, answer, onAnswerChange, hasExistingResponse }: QuestionCardProps) {
  return (
    <div className={`p-6 border rounded-lg ${hasExistingResponse ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
        {hasExistingResponse && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Répondu
          </span>
        )}
      </div>

      {question.type === 'radio' && (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label key={index} className="flex items-start">
              <input
                type="radio"
                name={question.id}
                checked={answer === option.label}
                onChange={() => onAnswerChange(option.label)}
                className="mt-1 mr-3"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label key={index} className="flex items-start">
              <input
                type="checkbox"
                checked={Array.isArray(answer) && answer.includes(option.label)}
                onChange={(e) => {
                  const currentAnswer = Array.isArray(answer) ? answer : []
                  if (e.target.checked) {
                    onAnswerChange([...currentAnswer, option.label])
                  } else {
                    onAnswerChange(currentAnswer.filter((item: string) => item !== option.label))
                  }
                }}
                className="mt-1 mr-3"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'tags' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Sélectionnez toutes les options qui s'appliquent :</p>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  const currentAnswer = Array.isArray(answer) ? answer : []
                  if (currentAnswer.includes(option.label)) {
                    onAnswerChange(currentAnswer.filter((item: string) => item !== option.label))
                  } else {
                    onAnswerChange([...currentAnswer, option.label])
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm border ${
                  Array.isArray(answer) && answer.includes(option.label)
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {question.type === 'conditional' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-start">
                <input
                  type="radio"
                  name={question.id}
                  checked={answer?.selected === option.label}
                  onChange={() => onAnswerChange({ 
                    selected: option.label, 
                    conditionalValues: answer?.conditionalValues || {} 
                  })}
                  className="mt-1 mr-3"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          
          {answer?.selected === question.options[question.options.length - 1]?.label && question.conditionalFields && (
            <div className="ml-6 mt-4 space-y-3 p-4 bg-gray-50 rounded-md">
              {question.conditionalFields.map((field, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={answer?.conditionalValues?.[field.label] || ''}
                    onChange={(e) => onAnswerChange({
                      ...answer,
                      conditionalValues: {
                        ...answer?.conditionalValues,
                        [field.label]: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 