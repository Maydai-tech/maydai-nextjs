import React from 'react'
import { Question, QuestionAnswer } from '../../types/usecase'

interface QuestionRendererProps {
  question: Question
  currentAnswer: any
  onAnswerChange: (answer: any) => void
}

export function QuestionRenderer({ question, currentAnswer, onAnswerChange }: QuestionRendererProps) {
  const renderRadioQuestion = () => (
    <div className="space-y-3">
      {question.options.map((option, index) => (
        <label
          key={index}
          className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
            currentAnswer === option
              ? 'border-[#0080A3] bg-[#0080A3]/5'
              : 'border-gray-200'
          }`}
        >
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={currentAnswer === option}
            onChange={() => onAnswerChange(option)}
            className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3]"
          />
          <span className="text-gray-900 leading-relaxed">{option}</span>
        </label>
      ))}
    </div>
  )

  const renderCheckboxQuestion = () => {
    const checkboxAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    
    return (
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
              checkboxAnswers.includes(option)
                ? 'border-[#0080A3] bg-[#0080A3]/5'
                : 'border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              name={question.id}
              value={option}
              checked={checkboxAnswers.includes(option)}
              onChange={(e) => {
                if (e.target.checked) {
                  onAnswerChange([...checkboxAnswers, option])
                } else {
                  onAnswerChange(checkboxAnswers.filter((item: string) => item !== option))
                }
              }}
              className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3]"
            />
            <span className="text-gray-900 leading-relaxed">{option}</span>
          </label>
        ))}
      </div>
    )
  }

  const renderTagsQuestion = () => {
    const tagAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (tagAnswers.includes(option)) {
                  onAnswerChange(tagAnswers.filter((item: string) => item !== option))
                } else {
                  onAnswerChange([...tagAnswers, option])
                }
              }}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                tagAnswers.includes(option)
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {tagAnswers.length > 0 && (
          <div className="text-sm text-gray-600">
            Sélectionnés: {tagAnswers.join(', ')}
          </div>
        )}
      </div>
    )
  }

  const renderConditionalQuestion = () => {
    const handleConditionalChange = (selectedOption: string, conditionalValues?: Record<string, string>) => {
      if (selectedOption === 'Si oui préciser') {
        onAnswerChange({
          selected: selectedOption,
          conditionalValues: conditionalValues || {}
        })
      } else {
        onAnswerChange(selectedOption)
      }
    }

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                (typeof currentAnswer === 'string' && currentAnswer === option) ||
                (typeof currentAnswer === 'object' && currentAnswer.selected === option)
                  ? 'border-[#0080A3] bg-[#0080A3]/5'
                  : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={
                  (typeof currentAnswer === 'string' && currentAnswer === option) ||
                  (typeof currentAnswer === 'object' && currentAnswer.selected === option)
                }
                onChange={() => handleConditionalChange(option)}
                className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3]"
              />
              <span className="text-gray-900 leading-relaxed">{option}</span>
            </label>
          ))}
        </div>

        {/* Conditional fields */}
        {typeof currentAnswer === 'object' && currentAnswer.selected === 'Si oui préciser' && question.conditionalFields && (
          <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
            {question.conditionalFields.map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={(currentAnswer.conditionalValues && currentAnswer.conditionalValues[field.label]) || ''}
                  onChange={(e) => {
                    handleConditionalChange('Si oui préciser', {
                      ...(currentAnswer.conditionalValues || {}),
                      [field.label]: e.target.value
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
      return <div>Type de question non supporté</div>
  }
} 