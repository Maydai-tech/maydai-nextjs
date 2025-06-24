import React from 'react'
import { Question, QuestionAnswer } from '../../types/usecase'

interface QuestionRendererProps {
  question: Question
  currentAnswer: any
  onAnswerChange: (answer: any) => void
  isReadOnly?: boolean
}

export function QuestionRenderer({ question, currentAnswer, onAnswerChange, isReadOnly = false }: QuestionRendererProps) {
  console.log('QuestionRenderer render:', {
    questionId: question.id,
    currentAnswer,
    answerType: typeof currentAnswer,
    isArray: Array.isArray(currentAnswer),
    isReadOnly
  })

  const renderRadioQuestion = () => (
    <div className="space-y-3">
      {question.options.map((option, index) => {
        const isChecked = currentAnswer === option.code
        
        return (
          <label
            key={`${question.id}-${option.code}-${index}`}
            className={`flex items-start p-4 border rounded-lg transition-all ${
              isReadOnly 
                ? 'cursor-default' 
                : 'cursor-pointer hover:bg-gray-50'
            } ${
              isChecked
                ? 'border-[#0080A3] bg-[#0080A3]/5'
                : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={option.code}
              checked={isChecked}
              disabled={isReadOnly}
              onChange={() => {
                if (!isReadOnly) {
                  console.log('Radio change:', option.code)
                  onAnswerChange(option.code)
                }
              }}
              className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3] disabled:opacity-50"
            />
            <span className={`leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
              {option.label}
            </span>
          </label>
        )
      })}
    </div>
  )

  const renderCheckboxQuestion = () => {
    // S'assurer que currentAnswer est toujours un tableau
    const checkboxAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    
    console.log('Checkbox render:', {
      currentAnswer,
      checkboxAnswers,
      options: question.options.map(opt => opt.code),
      isReadOnly
    })
    
    return (
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isChecked = checkboxAnswers.includes(option.code)
          
          return (
            <label
              key={`${question.id}-${option.code}-${index}`}
              className={`flex items-start p-4 border rounded-lg transition-all ${
                isReadOnly 
                  ? 'cursor-default' 
                  : 'cursor-pointer hover:bg-gray-50'
              } ${
                isChecked
                  ? 'border-[#0080A3] bg-[#0080A3]/5'
                  : 'border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                name={`${question.id}-${option.code}`}
                value={option.code}
                checked={isChecked}
                disabled={isReadOnly}
                onChange={(e) => {
                  if (!isReadOnly) {
                    console.log('Checkbox change:', {
                      option: option.code,
                      checked: e.target.checked,
                      currentAnswers: checkboxAnswers
                    })
                    
                    let newAnswers: string[]
                    if (e.target.checked) {
                      // Ajouter l'option
                      newAnswers = [...checkboxAnswers, option.code]
                    } else {
                      // Retirer l'option
                      newAnswers = checkboxAnswers.filter((item: string) => item !== option.code)
                    }
                    
                    console.log('New checkbox answers:', newAnswers)
                    onAnswerChange(newAnswers)
                  }
                }}
                className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3] disabled:opacity-50"
              />
              <span className={`leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
                {option.label}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  const renderTagsQuestion = () => {
    // S'assurer que currentAnswer est toujours un tableau
    const tagAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    
    console.log('Tags render:', {
      currentAnswer,
      tagAnswers,
      options: question.options.map(opt => opt.code),
      isReadOnly
    })
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, index) => {
            const isSelected = tagAnswers.includes(option.code)
            
            return (
              <button
                key={`${question.id}-${option.code}-${index}`}
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  if (!isReadOnly) {
                    console.log('Tag click:', {
                      option: option.code,
                      isSelected,
                      currentTags: tagAnswers
                    })
                    
                    let newAnswers: string[]
                    if (isSelected) {
                      // Retirer le tag
                      newAnswers = tagAnswers.filter((item: string) => item !== option.code)
                    } else {
                      // Ajouter le tag
                      newAnswers = [...tagAnswers, option.code]
                    }
                    
                    console.log('New tag answers:', newAnswers)
                    onAnswerChange(newAnswers)
                  }
                }}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#0080A3] text-white'
                    : isReadOnly
                    ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${isReadOnly ? 'opacity-75' : ''}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

      </div>
    )
  }

  const renderConditionalQuestion = () => {
    const handleConditionalChange = (selectedOption: string, conditionalValues?: Record<string, string>) => {
      if (isReadOnly) return
      
      console.log('Conditional change:', {
        selectedOption,
        conditionalValues,
        currentAnswer
      })
      
      // Pour les questions avec des champs conditionnels, on vérifie si c'est "Oui" (code .B)
      const hasConditionalFields = question.conditionalFields && question.conditionalFields.length > 0
      const isYesOption = selectedOption.endsWith('.B') && hasConditionalFields
      const isOtherOption = selectedOption === 'E4.N8.Q10.G'
      
      if (isYesOption || isOtherOption) {
        const newAnswer = {
          selected: selectedOption,
          conditionalValues: conditionalValues || {}
        }
        console.log('Setting conditional answer:', newAnswer)
        onAnswerChange(newAnswer)
      } else {
        console.log('Setting simple answer:', selectedOption)
        onAnswerChange(selectedOption)
      }
    }

    // Déterminer l'état actuel
    const currentSelection = typeof currentAnswer === 'string' 
      ? currentAnswer 
      : (typeof currentAnswer === 'object' && currentAnswer?.selected)
        ? currentAnswer.selected
        : null

    const currentConditionalValues = typeof currentAnswer === 'object' && currentAnswer?.conditionalValues
      ? currentAnswer.conditionalValues
      : {}

    console.log('Conditional render:', {
      currentAnswer,
      currentSelection,
      currentConditionalValues
    })

    // Filtrer les options pour ne pas afficher "Si oui préciser" (code .C)
    const visibleOptions = question.options.filter(option => !option.code.endsWith('.C'))

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {visibleOptions.map((option, index) => {
            const isChecked = currentSelection === option.code
            
            return (
              <label
                key={`${question.id}-${option.code}-${index}`}
                className={`flex items-start p-4 border rounded-lg transition-all ${
                  isReadOnly 
                    ? 'cursor-default' 
                    : 'cursor-pointer hover:bg-gray-50'
                } ${
                  isChecked
                    ? 'border-[#0080A3] bg-[#0080A3]/5'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.code}
                  checked={isChecked}
                  disabled={isReadOnly}
                  onChange={() => {
                    if (!isReadOnly) {
                      console.log('Conditional radio change:', option.code)
                      handleConditionalChange(option.code)
                    }
                  }}
                  className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3] disabled:opacity-50"
                />
                <span className={`leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
                  {option.label}
                </span>
              </label>
            )
          })}
        </div>

        {/* Conditional fields - Affichés quand "Oui" est sélectionné (.B) ou "Other" (E4.N8.Q10.G) */}
        {((currentSelection?.endsWith('.B') && question.conditionalFields) || currentSelection === 'E4.N8.Q10.G') && question.conditionalFields && (
          <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Veuillez préciser :
            </div>
            {question.conditionalFields.map((field, index) => (
              <div key={`${question.id}-${field.key}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={currentConditionalValues[field.key] || ''}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    if (!isReadOnly) {
                      console.log('Conditional field change:', {
                        field: field.key,
                        value: e.target.value
                      })
                      
                      const newConditionalValues = {
                        ...currentConditionalValues,
                        [field.key]: e.target.value
                      }
                      
                      handleConditionalChange(currentSelection!, newConditionalValues)
                    }
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent ${
                    isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Rendu principal selon le type de question
  switch (question.type) {
    case 'radio':
      return renderRadioQuestion()
    case 'checkbox':
      return renderCheckboxQuestion()
    case 'tags':
      return renderTagsQuestion()
    case 'conditional':
      return renderConditionalQuestion()
    default:
      return (
        <div className="text-red-600">
          Type de question non supporté: {question.type}
        </div>
      )
  }
} 