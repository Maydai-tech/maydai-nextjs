import React from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { Question, QuestionOption } from '../../types/usecase'
import Tooltip from '@/components/Tooltip'
import {
  getE4N7CheckboxGroups,
  getE4N7VisualSegment,
  type E4N7VisualSegment,
} from '../../utils/e4n7-qualification-ui'
import type { QuestionnairePathMode } from '../../utils/questionnaire'
import {
  V3_FULL_ENTREPRISE_ID,
  V3_FULL_TRANSPARENCE_ID,
  V3_FULL_USAGE_ID,
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
  isV3ShortPathCompositeQuestionId,
} from '../../utils/questionnaire-v3-graph'
import { computeCheckboxNextAnswers } from '../../utils/compute-checkbox-next-answers'
import {
  selectableCardBase,
  selectableCardInteractive,
  selectableCardSelected,
  selectableCardDimmed,
  VisualRadioMark,
  VisualCheckboxMark,
} from '@/components/ui/selectable-question-cards'

export { computeCheckboxNextAnswers }

function E4N7GroupedContextBanner({ segment }: { segment: E4N7VisualSegment }) {
  if (segment === 'annex-iii' || segment === null) return null
  let title = 'Contexte réglementaire'
  let body: string
  if (segment === 'prohibited-art5') {
    title = 'Finalités prohibées (article 5)'
    body =
      'Les pratiques listées sont interdites lorsqu’elles s’appliquent telles quelles à votre système. Cochez tout ce qui correspond à votre situation réelle, ou l’option dédiée si aucune ne s’applique.'
  } else if (segment === 'prohibited-situations') {
    title = 'Situations encadrées (article 5.1)'
    body =
      'Certaines finalités visant des personnes physiques ou des évaluations automatisées sont très encadrées. Indiquez ce qui correspond à votre cas d’usage.'
  } else if (segment === 'ors-narrowing') {
    title = 'Affinage de la qualification'
    body =
      'Ces questions précisent le chemin réglementaire ouvert par vos réponses sur les domaines sensibles (Annexe III).'
  } else {
    return null
  }
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
      <div>
        <p className="font-medium text-sky-950">{title}</p>
        <p className="mt-1 text-sky-900/95">{body}</p>
      </div>
    </div>
  )
}

const V3_SHORT_STAGE_HEADINGS: Record<string, string> = {
  [V3_SHORT_ENTREPRISE_ID]: 'Entreprise',
  [V3_FULL_ENTREPRISE_ID]: 'Entreprise',
  [V3_SHORT_USAGE_ID]: 'Usage',
  [V3_FULL_USAGE_ID]: 'Usage',
  [V3_SHORT_TRANSPARENCE_ID]: 'Transparence',
  [V3_FULL_TRANSPARENCE_ID]: 'Transparence',
}

const V3_SHORT_TRANSPARENCE_UI_ROWS = [
  {
    label: "Information sur l'interaction avec une IA",
    tooltip:
      "L'Article 50 exige d'informer clairement les personnes physiques qu'elles interagissent directement avec un système d'IA.",
  },
  {
    label: 'Marquage et identification du contenu généré',
    tooltip:
      "L'Article 50 impose de marquer les contenus générés ou manipulés pour qu'ils soient identifiables comme artificiels.",
  },
] as const

function V3ShortLegalInfoButton({
  tooltipId,
  tooltipText,
  ariaTopic,
}: {
  tooltipId: string
  tooltipText: string
  ariaTopic: string
}) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3] rounded"
        aria-label={`Afficher l'information juridique pour : ${ariaTopic}`}
        aria-describedby={tooltipId}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Info className="w-4 h-4 text-gray-400 hover:text-[#0080A3] transition-colors" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute z-30 hidden w-[min(80vw,420px)] rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg left-1/2 top-full mt-2 -translate-x-1/2 group-hover:block group-focus-within:block"
      >
        {tooltipText}
      </span>
    </span>
  )
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
  /** Même normalisation que `renderCheckboxQuestion` (parcours long) — source de vérité : `questionnaireData.answers[id]`. */
  const checkboxAnswers: string[] = Array.isArray(currentAnswer)
    ? (currentAnswer as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
    : []

  const hasExclusiveSelected = question.options.some(
    (o) => Boolean(o.unique_answer) && checkboxAnswers.includes(o.code)
  )

  const applyCheckboxChange = (option: QuestionOption, checked: boolean) => {
    if (isReadOnly) return
    onAnswerChange(computeCheckboxNextAnswers(checkboxAnswers, question.options, option, checked))
  }

  const submitInsufficientInfo = async () => {
    if (isReadOnly || insufficientInfoBusy) return
    if (onSubmitInsufficientInfo) {
      onAnswerChange([])
      await onSubmitInsufficientInfo()
      return
    }
    onAnswerChange([])
  }

  const heading = V3_SHORT_STAGE_HEADINGS[question.id] ?? 'Parcours court'

  const isV3ShortEntreprise =
    question.id === V3_SHORT_ENTREPRISE_ID || question.id === V3_FULL_ENTREPRISE_ID
  const isV3ShortUsage =
    question.id === V3_SHORT_USAGE_ID || question.id === V3_FULL_USAGE_ID
  const isV3ShortTransparence =
    question.id === V3_SHORT_TRANSPARENCE_ID || question.id === V3_FULL_TRANSPARENCE_ID

  const getOptionLegalTooltip = (opt: QuestionOption): string | null => {
    if (isV3ShortEntreprise) {
      switch (opt.code) {
        case 'E4.N8.Q12.A':
          return "L’Article 4 exige de garantir un niveau suffisant de maîtrise de l’IA pour votre personnel utilisant ces systèmes."
        case 'E5.N9.Q7.B':
          return 'Outil de gouvernance essentiel pour cartographier vos IA, prévenir le Shadow AI et garantir la traçabilité (Art.12).'
        case 'E5.N9.Q1.A':
          return "Processus itératif imposé pour l'IA à haut risque (Art.9) et bonne pratique recommandée pour vos autres déploiements."
        default:
          return null
      }
    }
    if (isV3ShortUsage) {
      switch (opt.code) {
        case 'E5.N9.Q8.B':
          return "L'Article 14 exige un contrôle effectif par des personnes physiques disposant des compétences et de l'autorité nécessaires."
        case 'E5.N9.Q3.A':
          return "Mesure technique (Art. 9 et 15) essentielle pour encadrer l'IA, garantir sa robustesse et atténuer les risques."
        case 'E5.N9.Q4.A':
          return "L'Article 11 impose de tenir à jour une documentation exhaustive démontrant la conformité du système avant déploiement."
        case 'E5.N9.Q6.B':
          return "L'Article 10 exige une gouvernance stricte des données pour prévenir les biais et garantir un fonctionnement fiable."
        case 'E5.N9.Q9.B':
          return "L'Article 72 impose une surveillance après commercialisation pour évaluer en continu la conformité des systèmes d'IA déployés."
        default:
          return null
      }
    }
    if (isV3ShortTransparence) {
      switch (opt.code) {
        case 'E6.N10.TRANSPARENCY_PACK.INTERACTION':
        case 'E6.N10.TRANSPARENCY_PACK.A':
          return V3_SHORT_TRANSPARENCE_UI_ROWS[0].tooltip
        case 'E6.N10.TRANSPARENCY_PACK.CONTENT':
          return V3_SHORT_TRANSPARENCE_UI_ROWS[1].tooltip
        default:
          break
      }
    }
    return null
  }

  const getOptionDisplayLabel = (opt: QuestionOption): string => {
    if (isV3ShortTransparence) {
      if (
        opt.code === 'E6.N10.TRANSPARENCY_PACK.INTERACTION' ||
        opt.code === 'E6.N10.TRANSPARENCY_PACK.CONTENT'
      ) {
        return opt.label
      }
    }
    if (!isV3ShortUsage) return opt.label
    switch (opt.code) {
      case 'E5.N9.Q8.B':
        return "Désignation d'un responsable humain pour le contrôle"
      case 'E5.N9.Q3.A':
        return 'Définition et stockage des instructions systèmes / prompts'
      case 'E5.N9.Q4.A':
        return "Réalisation d'une documentation technique"
      case 'E5.N9.Q6.B':
        return 'Procédures de vérification de la qualité des données'
      case 'E5.N9.Q9.B':
        return 'Plan de surveillance continue'
      default:
        return opt.label
    }
  }

  const shortListClass =
    question.options.length > 3
      ? 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4'
      : 'mb-6 space-y-3'

  const renderShortOptionCard = (opt: QuestionOption) => {
    const isChecked = checkboxAnswers.includes(opt.code)
    const isExclusive = Boolean(opt.unique_answer)
    const dimOtherOptions = hasExclusiveSelected && !isExclusive
    const interactive = !isReadOnly && !dimOtherOptions
    const tooltipText = getOptionLegalTooltip(opt)
    const displayLabel = getOptionDisplayLabel(opt)
    const tooltipId = `v3-short-${question.id}-opt-${opt.code}-tooltip`

    return (
      <label
        key={opt.code}
        className={`${selectableCardBase} ${interactive ? selectableCardInteractive : ''} ${
          dimOtherOptions ? selectableCardDimmed : ''
        } ${isChecked ? selectableCardSelected : ''}`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => applyCheckboxChange(opt, e.target.checked)}
          disabled={isReadOnly || dimOtherOptions}
          className="sr-only"
          aria-checked={isChecked}
        />
        <VisualCheckboxMark checked={isChecked} exclusive={isExclusive} />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 leading-relaxed text-gray-900">
          <span>{displayLabel}</span>
          {tooltipText ? (
            <V3ShortLegalInfoButton
              tooltipId={tooltipId}
              tooltipText={tooltipText}
              ariaTopic={displayLabel}
            />
          ) : null}
        </span>
      </label>
    )
  }

  const renderShortOptionsBlock = () => {
    if (isV3ShortTransparence && question.options.length === 1) {
      const opt = question.options[0]
      const isChecked = checkboxAnswers.includes(opt.code)
      const isExclusive = Boolean(opt.unique_answer)
      const interactive = !isReadOnly

      return (
        <div className={shortListClass}>
          <label
            className={`${selectableCardBase} ${
              interactive ? selectableCardInteractive : 'cursor-default'
            } ${isChecked ? selectableCardSelected : ''}`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => applyCheckboxChange(opt, e.target.checked)}
              disabled={isReadOnly}
              className="sr-only"
              aria-checked={isChecked}
            />
            <VisualCheckboxMark checked={isChecked} exclusive={isExclusive} />
            <div className="min-w-0 flex-1 space-y-3 leading-relaxed text-gray-900">
              <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Données : une seule option est configurée pour cette étape. Les deux volets juridiques (Art. 50) sont
                regroupés ci-dessous ; pour deux réponses distinctes en base, ajoutez une seconde option dans le JSON
                (ex. <code className="font-mono text-[11px]">questions-with-scores.json</code>) et synchronisez le
                scoring si nécessaire.
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{V3_SHORT_TRANSPARENCE_UI_ROWS[0].label}</span>
                <V3ShortLegalInfoButton
                  tooltipId={`v3-short-${question.id}-transp-row-0`}
                  tooltipText={V3_SHORT_TRANSPARENCE_UI_ROWS[0].tooltip}
                  ariaTopic={V3_SHORT_TRANSPARENCE_UI_ROWS[0].label}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{V3_SHORT_TRANSPARENCE_UI_ROWS[1].label}</span>
                <V3ShortLegalInfoButton
                  tooltipId={`v3-short-${question.id}-transp-row-1`}
                  tooltipText={V3_SHORT_TRANSPARENCE_UI_ROWS[1].tooltip}
                  ariaTopic={V3_SHORT_TRANSPARENCE_UI_ROWS[1].label}
                />
              </div>
            </div>
          </label>
        </div>
      )
    }

    return <div className={shortListClass}>{question.options.map((opt) => renderShortOptionCard(opt))}</div>
  }

  return (
    <div
      data-v3-short-path-stage={question.id}
      className="w-full max-w-3xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-900">{heading}</h2>
      <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
        {isV3ShortEntreprise ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Quelles bonnes pratiques d&apos;encadrement de l&apos;IA sont actuellement en place ?
            </h3>
            <p className="text-sm text-gray-500">
              Cochez les éléments déjà effectifs. Laissez vide si la pratique n&apos;est pas encore déployée.
            </p>
          </div>
        ) : null}
        {isV3ShortUsage ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Quelles bonnes pratiques d&apos;encadrement sont appliquées à ce cas d&apos;usage spécifique ?
            </h3>
            <p className="text-sm text-gray-500">
              Cochez les éléments déjà effectifs. Laissez vide si la pratique n&apos;est pas encore déployée.
            </p>
          </div>
        ) : null}
        {isV3ShortTransparence ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Comment gérez-vous la transparence de ce système d&apos;IA envers les utilisateurs ?
            </h3>
            <p className="text-sm text-gray-500">
              Cochez les éléments déjà effectifs. Laissez vide si la pratique n&apos;est pas encore déployée.
            </p>
          </div>
        ) : null}
        {!isV3ShortEntreprise && !isV3ShortUsage && !isV3ShortTransparence ? (
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{question.question}</p>
        ) : null}
        {renderShortOptionsBlock()}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => void submitInsufficientInfo()}
            disabled={isReadOnly || insufficientInfoBusy}
            className="w-full flex items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-lg text-left hover:bg-blue-50 hover:border-[#0080A3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Déclarer que l'information n'est pas disponible et passer à l'étape suivante"
          >
            <span className="text-sm font-medium text-gray-700 group-hover:text-[#0080A3]">
              Information non disponible à ce stade
            </span>
            <span className="text-sm text-gray-500 group-hover:text-[#0080A3]" aria-hidden="true">
              Passer l&apos;étape &rarr;
            </span>
          </button>
        </div>
      </div>
      {isV3ShortTransparence ? (
        <div className="mt-8 p-4 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#0080A3] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Évaluation terminée</h4>
            <p className="text-sm text-gray-600 mt-1">
              En validant cette étape, vos réponses seront enregistrées de manière sécurisée. Notre moteur calculera
              votre niveau de risque AI Act et vous pourrez consulter votre rapport sur le tableau de bord.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
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

  const renderQuestionDescription = () => {
    const text = question.description?.trim()
    if (!text) return null
    return <p className="mb-4 text-sm leading-relaxed text-gray-600">{text}</p>
  }

  const renderRadioQuestion = () => {
    const optionCount = question.options.length
    const listClass =
      optionCount > 3 ? 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 mb-6' : 'mb-6 space-y-3'

    return (
      <>
        {renderQuestionDescription()}
        <div className={listClass}>
          {question.options.map((option, index) => {
            const isChecked = currentAnswer === option.code
            const interactive = !isReadOnly

            return (
              <label
                key={`${question.id}-${option.code}-${index}`}
                className={`${selectableCardBase} ${
                  interactive ? selectableCardInteractive : 'cursor-default'
                } ${isChecked ? selectableCardSelected : ''}`}
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
                  className="sr-only"
                />
                <VisualRadioMark checked={isChecked} />
                <div className="flex min-w-0 flex-1 flex-col">
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
                        isolateSelection
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
  }

  const renderCheckboxQuestion = () => {
    const checkboxAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
    const hasExclusiveSelected = question.options.some(
      (o) => Boolean(o.unique_answer) && checkboxAnswers.includes(o.code)
    )

    const renderCheckboxRow = (option: QuestionOption, index: number) => {
      const isChecked = checkboxAnswers.includes(option.code)
      const isExclusive = Boolean(option.unique_answer)
      const dimOtherOptions = hasExclusiveSelected && !isExclusive
      const interactive = !isReadOnly && !dimOtherOptions

      return (
        <label
          key={`${question.id}-${option.code}-${index}`}
          className={`${selectableCardBase} ${
            interactive ? selectableCardInteractive : ''
          } ${dimOtherOptions ? selectableCardDimmed : ''} ${
            isChecked ? selectableCardSelected : ''
          }`}
        >
          <input
            type="checkbox"
            name={`${question.id}-${option.code}`}
            value={option.code}
            checked={isChecked}
            aria-checked={isChecked}
            disabled={isReadOnly || dimOtherOptions}
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
            className="sr-only"
          />
          <VisualCheckboxMark checked={isChecked} exclusive={isExclusive} />
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className={`min-w-0 flex-1 leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
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
                isolateSelection
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
      const segmentWrapperClass = usePlainShell
        ? ''
        : 'space-y-8 rounded-xl border border-gray-200 bg-slate-50/50 p-4 sm:p-5'

      return (
        <>
          {renderQuestionDescription()}
          <div
            className={segmentWrapperClass}
            data-e4n7-segment={seg ?? undefined}
            data-e4n7-grouped="true"
          >
            {!usePlainShell && seg ? <E4N7GroupedContextBanner segment={seg} /> : null}
            {groups.map((group) => {
              const hideHeading = Boolean(group.hideHeading)
              const gridGapClass =
                group.codes.length > 3
                  ? 'grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4'
                  : group.codes.length > 1
                    ? 'grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4'
                    : 'grid grid-cols-1 gap-3'
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
                        className="text-base font-semibold tracking-tight text-gray-900"
                      >
                        {group.title}
                      </h3>
                      {group.description ? (
                        <p className="text-sm leading-relaxed text-gray-600">{group.description}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className={gridGapClass}>
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

    const flatCount = question.options.length
    const flatListClass =
      flatCount > 3 ? 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4' : 'mb-6 space-y-3'

    return (
      <>
        {renderQuestionDescription()}
        <div className={flatListClass}>
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
                {(option as QuestionOption).tooltip && (
                  <Tooltip
                    title={(option as QuestionOption).tooltip!.title}
                    shortContent={(option as QuestionOption).tooltip!.shortContent}
                    fullContent={(option as QuestionOption).tooltip!.fullContent}
                    icon={(option as QuestionOption).tooltip!.icon}
                    type="answer"
                    position="auto"
                    isolateSelection
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
        <div
          className={
            visibleOptions.length > 3
              ? 'mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4'
              : 'mb-6 space-y-3'
          }
        >
          {visibleOptions.map((option, index) => {
            const isChecked = currentSelection === option.code
            const interactive = !isReadOnly

            return (
              <label
                key={`${question.id}-${option.code}-${index}`}
                className={`${selectableCardBase} ${
                  interactive ? selectableCardInteractive : 'cursor-default'
                } ${isChecked ? selectableCardSelected : ''}`}
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
                  className="sr-only"
                />
                <VisualRadioMark checked={isChecked} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`leading-relaxed ${isReadOnly ? 'text-gray-700' : 'text-gray-900'}`}>
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
                      isolateSelection
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
            className={
              question.conditional_detail_optional
                ? 'space-y-3 rounded-xl border border-dashed border-[#0080A3]/25 bg-white p-4 sm:p-5'
                : 'space-y-3 rounded-xl border border-gray-200 bg-slate-50/50 p-4 sm:p-5'
            }
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