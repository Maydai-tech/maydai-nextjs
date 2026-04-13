import React, { useEffect, useState } from 'react'
import { Question, QuestionOption } from '../../types/usecase'
import Tooltip from '@/components/Tooltip'
import { getE4N7CheckboxGroups, getE4N7VisualSegment } from '../../utils/e4n7-qualification-ui'
import type { QuestionnairePathMode } from '../../utils/questionnaire'
import {
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
  isV3ShortPathCompositeQuestionId,
} from '../../utils/questionnaire-v3-graph'

const V3_SHORT_STAGE_HEADINGS: Record<string, string> = {
  [V3_SHORT_ENTREPRISE_ID]: 'Entreprise',
  [V3_SHORT_USAGE_ID]: 'Usage',
  [V3_SHORT_TRANSPARENCE_ID]: 'Transparence',
}

/**
 * Une étape du parcours court V3 : cases à cocher + déclaration « information insuffisante » (`[]` persistée puis avancement).
 */
export function V3ShortPathStageQuestion({
  question,
  currentAnswer,
  onAnswerChange,
  onSubmitInsufficientInfo,
  insufficientInfoBusy = false,
  isReadOnly = false,
}: {
  question: Question
  currentAnswer: unknown
  onAnswerChange: (answer: string[]) => void
  /** Si fourni : clic « Je ne sais pas / Passer » = soumission explicite de `[]` + enchaînement (pas seulement state local). */
  onSubmitInsufficientInfo?: () => void | Promise<void>
  /** Désactive le bouton pendant la sauvegarde / navigation (évite double clic). */
  insufficientInfoBusy?: boolean
  isReadOnly?: boolean
}) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() =>
    Array.isArray(currentAnswer)
      ? (currentAnswer as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
      : []
  )

  useEffect(() => {
    if (!Array.isArray(currentAnswer)) return
    setSelectedCodes(
      (currentAnswer as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
    )
  }, [currentAnswer])

  const toggleCode = (code: string) => {
    if (isReadOnly) return
    setSelectedCodes((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      onAnswerChange(next)
      return next
    })
  }

  const submitInsufficientInfo = async () => {
    if (isReadOnly || insufficientInfoBusy) return
    setSelectedCodes([])
    if (onSubmitInsufficientInfo) {
      await onSubmitInsufficientInfo()
      return
    }
    onAnswerChange([])
  }

  const heading = V3_SHORT_STAGE_HEADINGS[question.id] ?? 'Parcours court'

  return (
    <div
      data-v3-short-path-stage={question.id}
      className="w-full max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-900">{heading}</h2>
      <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{question.question}</p>
        <div className="space-y-3 mb-6">
          {question.options.map((opt) => (
            <label key={opt.code} className="flex items-start gap-3 cursor-pointer sm:items-center">
              <input
                type="checkbox"
                checked={selectedCodes.includes(opt.code)}
                onChange={() => toggleCode(opt.code)}
                disabled={isReadOnly}
                className="mt-1 sm:mt-0 form-checkbox h-5 w-5 text-[#0080A3] rounded border-gray-300 shrink-0"
              />
              <span className="text-gray-900 leading-relaxed">{opt.label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={isReadOnly || insufficientInfoBusy}
          onClick={() => void submitInsufficientInfo()}
          className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Je ne sais pas / Passer (Information insuffisante)
        </button>
      </div>
    </div>
  )
}

function computeCheckboxNextAnswers(
  checkboxAnswers: string[],
  allOptions: QuestionOption[],
  option: QuestionOption,
  checked: boolean
): string[] {
  let newAnswers: string[]
  if (checked) {
    if (option.unique_answer) {
      newAnswers = [option.code]
    } else {
      const uniqueOptions = allOptions.filter((opt) => opt.unique_answer)
      const hasUniqueSelected = checkboxAnswers.some((answer) =>
        uniqueOptions.some((unique) => unique.code === answer)
      )

      if (hasUniqueSelected) {
        const filteredAnswers = checkboxAnswers.filter(
          (answer) => !uniqueOptions.some((unique) => unique.code === answer)
        )
        newAnswers = [...filteredAnswers, option.code]
      } else {
        newAnswers = [...checkboxAnswers, option.code]
      }
    }
  } else {
    newAnswers = checkboxAnswers.filter((item: string) => item !== option.code)
  }
  return newAnswers
}

interface QuestionRendererProps {
  question: Question
  currentAnswer: any
  onAnswerChange: (answer: any) => void
  isReadOnly?: boolean
  /** Parcours court : enveloppes colorées E4.N7 allégées */
  questionnairePathMode?: QuestionnairePathMode
  /** Pack court V3 : déclaration « information insuffisante » = `[]` persisté puis `handleNext` avec payload explicite. */
  onSubmitInsufficientInfo?: () => void | Promise<void>
  insufficientInfoBusy?: boolean
}

const checkboxFocusClass =
  'mt-1 mr-3 shrink-0 rounded border-gray-300 text-[#0080A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3] disabled:opacity-50'

export const QuestionRenderer = React.memo(function QuestionRenderer({
  question,
  currentAnswer,
  onAnswerChange,
  isReadOnly = false,
  questionnairePathMode,
  onSubmitInsufficientInfo,
  insufficientInfoBusy,
}: QuestionRendererProps) {
  if (isV3ShortPathCompositeQuestionId(question.id)) {
    return (
      <V3ShortPathStageQuestion
        question={question}
        currentAnswer={currentAnswer}
        onAnswerChange={onAnswerChange}
        onSubmitInsufficientInfo={onSubmitInsufficientInfo}
        insufficientInfoBusy={insufficientInfoBusy}
        isReadOnly={isReadOnly}
      />
    )
  }

  const questionDescriptionToneClass = (id: string) => {
    if (id === 'E4.N7.Q3' || id === 'E4.N7.Q3.1') {
      return 'mb-4 text-sm leading-relaxed font-medium text-red-600'
    }
    if (id === 'E4.N7.Q2' || id === 'E4.N7.Q2.1' || id === 'E4.N7.Q5') {
      return 'mb-4 text-sm leading-relaxed font-medium text-orange-600'
    }
    return 'mb-4 text-sm leading-relaxed text-gray-600'
  }

  const renderQuestionDescription = () => {
    const text = question.description?.trim()
    if (!text) return null
    return <p className={questionDescriptionToneClass(question.id)}>{text}</p>
  }

  const renderRadioQuestion = () => (
    <>
      {renderQuestionDescription()}
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
                  onAnswerChange(option.code)
                }
              }}
              className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3] disabled:opacity-50"
            />
            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex items-start gap-2">
                <span
                  className={`font-medium leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}
                >
                  {option.label}
                </span>
                {(option as QuestionOption).tooltip && (
                  <Tooltip
                    title={(option as QuestionOption).tooltip!.title}
                    shortContent={(option as QuestionOption).tooltip!.shortContent}
                    fullContent={(option as QuestionOption).tooltip!.fullContent}
                    icon={(option as QuestionOption).tooltip!.icon}
                    type="answer"
                    position="auto"
                  />
                )}
              </div>
              {option.description ? (
                <span className="mt-1 text-sm leading-relaxed text-gray-600">{option.description}</span>
              ) : null}
            </div>
          </label>
        )
      })}
    </div>
    </>
  )

  const renderCheckboxQuestion = () => {
    const checkboxAnswers = Array.isArray(currentAnswer) ? currentAnswer : []

    const renderCheckboxRow = (option: QuestionOption, index: number) => {
      const isChecked = checkboxAnswers.includes(option.code)
      const isExclusive = Boolean(option.unique_answer)

      return (
        <label
          key={`${question.id}-${option.code}-${index}`}
          className={`flex items-start p-3 sm:p-4 border rounded-lg transition-all ${
            isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'
          } ${
            isChecked
              ? isExclusive
                ? 'border-gray-700 bg-gray-100/80'
                : 'border-[#0080A3] bg-[#0080A3]/5'
              : 'border-gray-200'
          }`}
        >
          <input
            type="checkbox"
            name={`${question.id}-${option.code}`}
            value={option.code}
            checked={isChecked}
            aria-checked={isChecked}
            disabled={isReadOnly}
            onChange={(e) => {
              if (!isReadOnly) {
                const newAnswers = computeCheckboxNextAnswers(
                  checkboxAnswers,
                  question.options,
                  option,
                  e.target.checked
                )
                onAnswerChange(newAnswers)
              }
            }}
            className={checkboxFocusClass}
          />
          <div className="flex items-start flex-1 min-w-0 gap-2">
            <span className={`leading-relaxed flex-1 min-w-0 ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
              {option.label}
            </span>
            {(option as any).tooltip && (
              <Tooltip
                title={(option as any).tooltip.title}
                shortContent={(option as any).tooltip.shortContent}
                fullContent={(option as any).tooltip.fullContent}
                icon={(option as any).tooltip.icon}
                type="answer"
                position="auto"
              />
            )}
          </div>
        </label>
      )
    }

    const groups = getE4N7CheckboxGroups(question.id)
    if (groups) {
      const seg = getE4N7VisualSegment(question.id)
      const usePlainShell = questionnairePathMode === 'short'
      const segmentShell = usePlainShell
        ? ''
        : seg === 'annex-iii'
          ? 'rounded-xl border-l-4 border-sky-600 bg-sky-50/40 pl-3 sm:pl-5 py-4 pr-2 sm:pr-4'
          : seg === 'ors-narrowing'
            ? 'rounded-xl border-l-4 border-amber-500 bg-amber-50/35 pl-3 sm:pl-5 py-4 pr-2 sm:pr-4'
            : 'rounded-xl border-l-4 border-red-700 bg-red-50/25 pl-3 sm:pl-5 py-4 pr-2 sm:pr-4'

      return (
        <>
          {renderQuestionDescription()}
          <div
            className={`space-y-8 ${segmentShell}`}
            data-e4n7-segment={seg ?? undefined}
            data-e4n7-grouped="true"
          >
            {groups.map((group) => {
              const hideHeading = Boolean(group.hideHeading)
              return (
                <section
                  key={group.key}
                  className={`space-y-3 ${hideHeading ? 'mt-4 border-t border-gray-200 pt-4' : ''}`}
                  {...(hideHeading
                    ? { 'aria-label': 'Option sans autre choix' }
                    : { 'aria-labelledby': `${question.id}-${group.key}-title` })}
                >
                  {!hideHeading && group.title ? (
                    <div className="space-y-1">
                      <h3
                        id={`${question.id}-${group.key}-title`}
                        className="text-base font-semibold text-gray-900 tracking-tight"
                      >
                        {group.title}
                      </h3>
                      {group.description ? (
                        <p className="text-sm text-gray-600 leading-relaxed">{group.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    className={
                      group.codes.length > 1
                        ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
                        : 'grid grid-cols-1 gap-3'
                    }
                  >
                    {group.codes.map((code, idx) => {
                      const option = question.options.find((o) => o.code === code)
                      if (!option) return null
                      return renderCheckboxRow(option, idx)
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )
    }

    return (
      <>
        {renderQuestionDescription()}
        <div className="space-y-3">
          {question.options.map((option, index) => renderCheckboxRow(option, index))}
        </div>
      </>
    )
  }

  const renderTagsQuestion = () => {
    // S'assurer que currentAnswer est toujours un tableau
    const tagAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    
    return (
      <div className="space-y-4">
        {renderQuestionDescription()}
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, index) => {
            const isSelected = tagAnswers.includes(option.code)
            
            return (
              <div key={`${question.id}-${option.code}-${index}`} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    if (!isReadOnly) {
                      let newAnswers: string[]
                      if (isSelected) {
                        // Retirer le tag
                        newAnswers = tagAnswers.filter((item: string) => item !== option.code)
                      } else {
                        if (option.unique_answer) {
                          // Si cette option est une réponse unique, désélectionner toutes les autres
                          newAnswers = [option.code]
                        } else {
                          // Vérifier s'il y a déjà une réponse unique sélectionnée
                          const uniqueOptions = question.options.filter(opt => opt.unique_answer)
                          const hasUniqueSelected = tagAnswers.some(answer => 
                            uniqueOptions.some(unique => unique.code === answer)
                          )
                          
                          if (hasUniqueSelected) {
                            // Retirer les réponses uniques et ajouter la nouvelle
                            const filteredAnswers = tagAnswers.filter(answer =>
                              !uniqueOptions.some(unique => unique.code === answer)
                            )
                            newAnswers = [...filteredAnswers, option.code]
                          } else {
                            // Ajouter normalement
                            newAnswers = [...tagAnswers, option.code]
                          }
                        }
                      }
                      
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
                {(option as any).tooltip && (
                  <Tooltip
                    title={(option as any).tooltip.title}
                    shortContent={(option as any).tooltip.shortContent}
                    fullContent={(option as any).tooltip.fullContent}
                    icon={(option as any).tooltip.icon}
                    type="answer"
                    position="auto"
                  />
                )}
              </div>
            )
          })}
        </div>

      </div>
    )
  }

  const renderConditionalQuestion = () => {
    const handleConditionalChange = (selectedOption: string, conditionalValues?: Record<string, string>) => {
      if (isReadOnly) return
      
      // Pour les questions avec des champs conditionnels, on vérifie si c'est "Oui" (code .B)
      const hasConditionalFields = question.conditionalFields && question.conditionalFields.length > 0
      const isYesOption = selectedOption.endsWith('.B') && hasConditionalFields
      const isOtherOption = selectedOption === 'E4.N8.Q10.G'
      
      if (isYesOption || isOtherOption) {
        const newAnswer = {
          selected: selectedOption,
          conditionalValues: conditionalValues || {}
        }
        onAnswerChange(newAnswer)
      } else {
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

    // Filtrer les options pour ne pas afficher "Si oui préciser" (code .C)
    const visibleOptions = question.options.filter(option => !option.code.endsWith('.C'))

    return (
      <div className="space-y-4">
        {renderQuestionDescription()}
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
                      handleConditionalChange(option.code)
                    }
                  }}
                  className="mt-1 mr-3 text-[#0080A3] focus:ring-[#0080A3] disabled:opacity-50"
                />
                <div className="flex items-center flex-1">
                  <span className={`leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                  {(option as any).tooltip && (
                    <Tooltip
                      title={(option as any).tooltip.title}
                      shortContent={(option as any).tooltip.shortContent}
                      fullContent={(option as any).tooltip.fullContent}
                      icon={(option as any).tooltip.icon}
                      type="answer"
                      position="auto"
                    />
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {/* Conditional fields - Affichés quand "Oui" est sélectionné (.B) ou "Other" (E4.N8.Q10.G) */}
        {((currentSelection?.endsWith('.B') && question.conditionalFields) || currentSelection === 'E4.N8.Q10.G') && question.conditionalFields && (
          <div
            className={`ml-4 sm:ml-6 space-y-3 border-l-2 pl-3 sm:pl-4 ${
              question.conditional_detail_optional
                ? 'border-dashed border-[#0080A3]/35 bg-[#0080A3]/[0.04] rounded-r-lg py-3 pr-2'
                : 'border-gray-200'
            }`}
          >
            <div className="text-sm font-medium text-gray-800 mb-1">
              {question.conditional_detail_optional
                ? 'Précisions (optionnel ici)'
                : 'Veuillez préciser :'}
            </div>
            {question.conditional_detail_optional ? (
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                Vous pouvez avancer avec un simple <strong className="font-medium text-gray-800">Oui</strong> déclaratif.
                Les preuves et le détail opérationnel se complètent ensuite dans le{' '}
                <strong className="font-medium text-gray-800">dossier du cas</strong> et la{' '}
                <strong className="font-medium text-gray-800">todo conformité</strong> (y compris les actions liées à
                cette question).
              </p>
            ) : null}
            {question.conditionalFields.map((field) => (
              <div key={`${question.id}-${field.key}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {question.conditional_detail_optional ? (
                    <span className="text-xs font-normal text-gray-500 ml-1">(optionnel)</span>
                  ) : null}
                </label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={currentConditionalValues[field.key] || ''}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    if (!isReadOnly) {
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
}) 