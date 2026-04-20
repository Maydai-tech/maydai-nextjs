import { useState, useEffect, useCallback, useMemo } from 'react'
import { QuestionnaireData } from '../types/usecase'
import { loadQuestions } from '../utils/questions-loader'
import {
  getNextQuestion,
  getAbsoluteQuestionProgress,
  checkCanProceed,
  buildQuestionPath,
  getResumeQuestionId,
  type QuestionnairePathMode,
} from '../utils/questionnaire'
import { v3CompositeCanProceed, v3EntryFollowUpQuestionId } from '../utils/questionnaire-v3-ui'
import { computeV2UsecaseQuestionnaireFields } from '../utils/questionnaire-v2-graph'
import {
  computeV3UsecaseQuestionnaireFields,
  isV3ShortPathCompositeQuestionId,
  V3_FULL_ENTREPRISE_ID,
  V3_FULL_SOCIAL_ENV_ID,
  V3_FULL_TRANSPARENCE_ID,
  V3_FULL_USAGE_ID,
  V3_SHORT_ENTREPRISE_ID,
  V3_SHORT_MINIPACK_ID,
  V3_SHORT_SOCIAL_ENV_ID,
  V3_SHORT_TRANSPARENCE_ID,
  V3_SHORT_USAGE_ID,
} from '../utils/questionnaire-v3-graph'
import {
  declarativeAnswersAfterEnterpriseStage,
  declarativeAnswersAfterSocialEnvStage,
  declarativeAnswersAfterTransparenceStage,
  declarativeAnswersAfterUsageStage,
  normalizeShortPathStageSelection,
} from '../utils/v3-short-path-stages'
import { useQuestionnaireResponses } from '@/lib/hooks/useQuestionnaireResponses'
import { supabase } from '@/lib/supabase'
import { ScoreService } from '@/lib/score-service'
import { useAuth } from '@/lib/auth'
import {
  QUESTIONNAIRE_VERSION_V2,
  QUESTIONNAIRE_VERSION_V3,
  normalizeQuestionnaireVersion,
  type QuestionnaireVersion
} from '@/lib/questionnaire-version'
import {
  CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE,
  CHECKLIST_GOV_USECASE_QUESTION_CODE,
  collectE5DeclaredOptionCodes,
  collectE6DeclaredOptionCodes,
  isChecklistGovEnterpriseQuestionCode,
  isChecklistGovUsecaseQuestionCode,
} from '../utils/bpgv-transparency-checklist-save'
import { deriveMissingPenaltiesForShortPath } from '@/lib/derive-missing-penalties-short-path'

function normalizeStringArrayForChecklist(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** Charge utile API checklist entreprise : tableau de codes ou `{ bpgv_keys }`. */
function extractChecklistGovEnterpriseKeys(answer: unknown): string[] {
  if (Array.isArray(answer)) return normalizeStringArrayForChecklist(answer)
  if (answer !== null && typeof answer === 'object' && 'bpgv_keys' in answer) {
    return normalizeStringArrayForChecklist((answer as { bpgv_keys: unknown }).bpgv_keys)
  }
  return []
}

/** Charge utile API checklist usage : tableau de codes ou `{ transparency_keys }`. */
function extractChecklistGovUsecaseKeys(answer: unknown): string[] {
  if (Array.isArray(answer)) return normalizeStringArrayForChecklist(answer)
  if (answer !== null && typeof answer === 'object' && 'transparency_keys' in answer) {
    return normalizeStringArrayForChecklist((answer as { transparency_keys: unknown }).transparency_keys)
  }
  return []
}

interface UseEvaluationReturn {
  questionnaireData: QuestionnaireData
  currentQuestion: any
  progress: any
  nextQuestionId: string | null
  isLastQuestion: boolean
  canProceed: boolean
  canGoBack: boolean
  isSubmitting: boolean
  /** True pendant les appels `saveResponse` du hook questionnaire (complète isSubmitting). */
  isSaving: boolean
  isCompleted: boolean
  isCalculatingScore: boolean
  isGeneratingReport: boolean
  showProcessingAnimation: boolean
  questionnairePathMode: QuestionnairePathMode
  error: string | null
  handleAnswerSelect: (answer: any) => void
  /** V3 composite : enregistrer une réponse pour un code autre que la question courante (sans changer currentQuestionId). */
  setAnswerForQuestion: (questionId: string, answer: any) => void
  /** `explicitAnswerForCurrentStep` : soumission synchrone (ex. `[]` = information insuffisante sur les étapes pack court V3) sans dépendre du state parent. */
  handleNext: (opts?: { explicitAnswerForCurrentStep?: unknown }) => Promise<void>
  handlePrevious: () => void
  handleSubmit: () => Promise<void>
  handleProcessingComplete: () => void
}

/** Parcours court : Q1.2 (profilage usage) masquée à l’UI — valeur persistée pour le graphe / sauvegardes. */
const V3_SHORT_PATH_DEFAULT_Q1_2 = 'E4.N7.Q1.2.A' as const

interface UseEvaluationProps {
  usecaseId: string
  companyId?: string
  onComplete: () => void
  /** Défaut V1 si absent (cas d’usage créés avant V2). */
  questionnaireVersion?: number | null
  /** V3 : même valeur que usecases.system_type (ex. « Produit »). */
  systemType?: string | null
  /** V3 uniquement : `short` = parcours court (même graphe métier, périmètre actif réduit côté scoring). */
  questionnairePathMode?: QuestionnairePathMode
}

export function useEvaluation({
  usecaseId,
  companyId,
  onComplete,
  questionnaireVersion: questionnaireVersionProp,
  systemType: systemTypeProp,
  questionnairePathMode: questionnairePathModeProp = 'long',
}: UseEvaluationProps): UseEvaluationReturn {
  const questionnaireVersion: QuestionnaireVersion = useMemo(
    () => normalizeQuestionnaireVersion(questionnaireVersionProp),
    [questionnaireVersionProp]
  )
  const { session } = useAuth()
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false,
    checklist_gov_enterprise: [],
    checklist_gov_usecase: [],
  })
  
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showProcessingAnimation, setShowProcessingAnimation] = useState(false)
  const {
    formattedAnswers: savedAnswers,
    loading: loadingResponses,
    saving: isSaving,
    saveResponse,
    refreshResponses
  } = useQuestionnaireResponses(usecaseId)

  // Load initial data once (réponses questionnaire + checklists gouvernance sur `usecases`)
  useEffect(() => {
    if (!initialDataLoaded && !loadingResponses) {
      const run = async () => {
        let govEnt: string[] = []
        let govUc: string[] = []
        if (session?.access_token) {
          const { data: ucRow } = await supabase
            .from('usecases')
            .select('checklist_gov_enterprise, checklist_gov_usecase')
            .eq('id', usecaseId)
            .single()
          if (ucRow) {
            govEnt = Array.isArray(ucRow.checklist_gov_enterprise) ? ucRow.checklist_gov_enterprise : []
            govUc = Array.isArray(ucRow.checklist_gov_usecase) ? ucRow.checklist_gov_usecase : []
          }
        }

        if (savedAnswers && Object.keys(savedAnswers).length > 0) {
          const navOpts =
            questionnaireVersion === QUESTIONNAIRE_VERSION_V3
              ? {
                  systemType: systemTypeProp ?? null,
                  pathMode: questionnairePathModeProp,
                }
              : undefined
          let currentQuestionId = getResumeQuestionId(
            savedAnswers,
            questionnaireVersion,
            navOpts
          )
          if (
            questionnairePathModeProp === 'short' &&
            questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
            currentQuestionId === V3_SHORT_MINIPACK_ID
          ) {
            currentQuestionId = V3_SHORT_ENTREPRISE_ID
          }

          setQuestionnaireData(prev => ({
            ...prev,
            answers: { ...savedAnswers },
            currentQuestionId,
            checklist_gov_enterprise: govEnt,
            checklist_gov_usecase: govUc,
          }))

          const historyPath = buildQuestionPath(
            currentQuestionId,
            savedAnswers,
            questionnaireVersion,
            navOpts
          )
          setQuestionHistory(historyPath.length > 0 ? historyPath : ['E4.N7.Q1'])
        } else {
          setQuestionnaireData(prev => ({
            ...prev,
            currentQuestionId: 'E4.N7.Q1',
            answers: {},
            checklist_gov_enterprise: govEnt,
            checklist_gov_usecase: govUc,
          }))
          setQuestionHistory(['E4.N7.Q1'])
        }

        setInitialDataLoaded(true)
      }
      void run()
    }
  }, [
    savedAnswers,
    loadingResponses,
    initialDataLoaded,
    questionnaireVersion,
    systemTypeProp,
    questionnairePathModeProp,
    session?.access_token,
    usecaseId,
  ])

  /** Parcours court : si Q1.B sans Q1.2 (reprise ou brouillon), compléter la valeur par défaut pour débloquer l’étape composite. */
  useEffect(() => {
    if (!initialDataLoaded) return
    if (questionnaireVersion !== QUESTIONNAIRE_VERSION_V3) return
    if (questionnairePathModeProp !== 'short') return
    setQuestionnaireData((prev) => {
      if (prev.answers['E4.N7.Q1'] !== 'E4.N7.Q1.B') return prev
      if (typeof prev.answers['E4.N7.Q1.2'] === 'string' && prev.answers['E4.N7.Q1.2']) return prev
      return {
        ...prev,
        answers: { ...prev.answers, 'E4.N7.Q1.2': V3_SHORT_PATH_DEFAULT_Q1_2 },
      }
    })
  }, [initialDataLoaded, questionnaireVersion, questionnairePathModeProp])

  const questions = loadQuestions()
  const currentQuestion = questions[questionnaireData.currentQuestionId]
  const navOptions = useMemo(
    () =>
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3
        ? { systemType: systemTypeProp ?? null, pathMode: questionnairePathModeProp }
        : undefined,
    [questionnaireVersion, systemTypeProp, questionnairePathModeProp]
  )
  const nextQuestionId = getNextQuestion(
    questionnaireData.currentQuestionId,
    questionnaireData.answers,
    questionnaireVersion,
    navOptions
  )
  const isLastQuestion = nextQuestionId === null
  const compositeProceed =
    questionnaireVersion === QUESTIONNAIRE_VERSION_V3
      ? v3CompositeCanProceed(
          questionnaireData.currentQuestionId,
          questionnaireData.answers as Record<string, unknown>
        )
      : null
  const canProceed =
    compositeProceed !== null
      ? compositeProceed
      : checkCanProceed(currentQuestion, questionnaireData.answers[questionnaireData.currentQuestionId])
  const canGoBack = questionHistory.length > 1

  const progress = getAbsoluteQuestionProgress(questionnaireData.currentQuestionId, questionnaireVersion)

  const handleAnswerSelect = useCallback((answer: any) => {
    setQuestionnaireData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionnaireData.currentQuestionId]: answer
      }
    }))
    
    setError(null)
  }, [questionnaireData.currentQuestionId])

  const setAnswerForQuestion = useCallback((questionId: string, answer: any) => {
    setQuestionnaireData(prev => {
      const nextAnswers: Record<string, any> = { ...prev.answers, [questionId]: answer }
      if (questionId === 'E4.N7.Q1') {
        if (answer === 'E4.N7.Q1.A' || answer === 'E4.N7.Q1.C') delete nextAnswers['E4.N7.Q1.2']
        if (answer === 'E4.N7.Q1.B') {
          delete nextAnswers['E4.N7.Q1.1']
          if (questionnairePathModeProp === 'short') {
            nextAnswers['E4.N7.Q1.2'] = V3_SHORT_PATH_DEFAULT_Q1_2
          }
        }
      }
      if (questionId === 'E4.N8.Q11.0' && answer === 'E4.N8.Q11.0.B') {
        delete nextAnswers['E4.N8.Q11.1']
      }
      if (questionId === 'E4.N8.Q11.1') {
        for (const k of [
          'E4.N8.Q11.T1',
          'E4.N8.Q11.T1E',
          'E4.N8.Q11.T2',
          'E4.N8.Q11.M1',
          'E4.N8.Q11.M2',
        ]) {
          delete nextAnswers[k]
        }
      }
      if (questionId === 'E4.N8.Q11.T1') {
        for (const k of ['E4.N8.Q11.T1E', 'E4.N8.Q11.T2']) {
          delete nextAnswers[k]
        }
      }
      return { ...prev, answers: nextAnswers }
    })
    setError(null)
  }, [questionnairePathModeProp])

  const saveIndividualResponse = useCallback(async (questionId: string, answer: unknown) => {
    try {
      const applyChecklistSaveResult = (saved: Record<string, unknown> | void) => {
        if (saved && typeof saved === 'object' && (saved as { updated?: string }).updated === 'usecase_checklists') {
          const s = saved as {
            checklist_gov_enterprise?: string[]
            checklist_gov_usecase?: string[]
          }
          setQuestionnaireData(prev => ({
            ...prev,
            checklist_gov_enterprise: Array.isArray(s.checklist_gov_enterprise)
              ? s.checklist_gov_enterprise
              : prev.checklist_gov_enterprise,
            checklist_gov_usecase: Array.isArray(s.checklist_gov_usecase)
              ? s.checklist_gov_usecase
              : prev.checklist_gov_usecase,
          }))
        }
      }

      if (isChecklistGovEnterpriseQuestionCode(questionId)) {
        const keys = extractChecklistGovEnterpriseKeys(answer)
        const saved = await saveResponse(questionId, undefined, { bpgv_keys: keys })
        applyChecklistSaveResult(saved)
        return
      }
      if (isChecklistGovUsecaseQuestionCode(questionId)) {
        const keys = extractChecklistGovUsecaseKeys(answer)
        const saved = await saveResponse(questionId, undefined, { transparency_keys: keys })
        applyChecklistSaveResult(saved)
        return
      }
      if (questionId.startsWith('checklist_')) {
        const responseData: Record<string, unknown> =
          answer !== null && typeof answer === 'object' && !Array.isArray(answer)
            ? { ...(answer as Record<string, unknown>) }
            : { selected_codes: normalizeStringArrayForChecklist(answer) }
        await saveResponse(questionId, undefined, responseData)
        return
      }

      // Use the proper saveResponse method from useQuestionnaireResponses
      const questions = loadQuestions()
      const question = questions[questionId]
      if (!question) {
        // Parcours court V3 : `declarativeAnswersAfterUsageStage` / transparence écrivent des codes
        // (E5.N9.*, E6.N10.*, …) sans entrée dédiée dans questions-with-scores.json — persistance API directe.
        if (typeof answer === 'string' && answer.length > 0) {
          await saveResponse(questionId, answer)
          return
        }
        if (Array.isArray(answer)) {
          const codes = answer as string[]
          await saveResponse(questionId, undefined, {
            selected_codes: codes,
            selected_labels: codes,
          })
          return
        }
        if (answer !== null && typeof answer === 'object') {
          await saveResponse(questionId, undefined, answer as Record<string, unknown>)
          return
        }
        throw new Error(`Question not found: ${questionId}`)
      }

      if (question.type === 'radio') {
        if (typeof answer === 'string') {
          await saveResponse(questionId, answer)
        } else if (
          answer !== null &&
          typeof answer === 'object' &&
          !Array.isArray(answer) &&
          'selected' in answer
        ) {
          await saveResponse(questionId, undefined, answer as Record<string, unknown>)
        } else {
          await saveResponse(questionId, String(answer))
        }
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        const codes = Array.isArray(answer) ? (answer as string[]) : []
        await saveResponse(questionId, undefined, {
          selected_codes: codes,
          selected_labels: codes.map(code => {
            const option = question.options.find(opt => opt.code === code)
            return option?.label || code
          }),
        })
      } else {
        // Fallback for other types
        await saveResponse(questionId, undefined, answer)
      }
      
    } catch (error) {
      console.error('❌ Error in saveIndividualResponse:', error)
      throw error
    }
  }, [saveResponse])

  const handleProcessingComplete = useCallback(() => {
    setShowProcessingAnimation(false)
    setQuestionnaireData(prev => ({ ...prev, isCompleted: true }))
    setTimeout(() => {
      onComplete()
    }, 500)
  }, [onComplete])

  const handleNext = useCallback(async (opts?: { explicitAnswerForCurrentStep?: unknown }) => {
    const currentId = questionnaireData.currentQuestionId
    const isExplicitShortPackInsufficient =
      opts?.explicitAnswerForCurrentStep !== undefined &&
      questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
      questionnairePathModeProp === 'short' &&
      isV3ShortPathCompositeQuestionId(currentId)

    if (isSubmitting) return
    if (!isExplicitShortPackInsufficient && !canProceed) return

    setIsSubmitting(true)
    setError(null)

    try {
      const currentAnswer =
        isExplicitShortPackInsufficient && opts?.explicitAnswerForCurrentStep !== undefined
          ? opts.explicitAnswerForCurrentStep
          : questionnaireData.answers[currentId]

      /** V3 — étapes composites : sauver plusieurs codes puis sauter au même next que le graphe après le sous-questionnaire. */
      if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3 && currentId === 'E4.N7.Q1') {
        const merged = { ...questionnaireData.answers, [currentId]: currentAnswer } as Record<string, unknown>
        const subId = v3EntryFollowUpQuestionId(merged)
        if (!subId) {
          setIsSubmitting(false)
          return
        }
        const subAns = merged[subId]
        await saveIndividualResponse('E4.N7.Q1', merged['E4.N7.Q1'])
        await saveIndividualResponse(subId, subAns)

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }

        const nextId = getNextQuestion(subId, merged as Record<string, any>, questionnaireVersion, navOptions)
        if (nextId) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextId,
          }))
          setQuestionHistory(prev => [...prev, nextId])
        }
        setIsSubmitting(false)
        return
      }

      if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3 && currentId === 'E4.N8.Q11.0') {
        const merged = { ...questionnaireData.answers, [currentId]: currentAnswer } as Record<string, unknown>
        await saveIndividualResponse('E4.N8.Q11.0', merged['E4.N8.Q11.0'])
        if (merged['E4.N8.Q11.0'] === 'E4.N8.Q11.0.A') {
          await saveIndividualResponse('E4.N8.Q11.1', merged['E4.N8.Q11.1'])
        }

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }

        const fromId =
          merged['E4.N8.Q11.0'] === 'E4.N8.Q11.0.A' ? 'E4.N8.Q11.1' : 'E4.N8.Q11.0'
        const nextId = getNextQuestion(fromId, merged as Record<string, any>, questionnaireVersion, navOptions)
        if (nextId) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextId,
          }))
          setQuestionHistory(prev => [...prev, nextId])
        }
        setIsSubmitting(false)
        return
      }

      if (
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
        (currentId === V3_SHORT_ENTREPRISE_ID || currentId === V3_FULL_ENTREPRISE_ID)
      ) {
        const sel = normalizeShortPathStageSelection(currentAnswer)
        const patches = declarativeAnswersAfterEnterpriseStage(sel)
        const merged = {
          ...questionnaireData.answers,
          [currentId]: sel,
          ...patches,
        } as Record<string, unknown>

        await saveIndividualResponse(currentId, sel)
        for (const [qid, val] of Object.entries(patches)) {
          await saveIndividualResponse(qid, val)
        }
        await saveIndividualResponse(CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE, { bpgv_keys: sel })

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }

        const nextId = getNextQuestion(
          currentId,
          merged as Record<string, any>,
          questionnaireVersion,
          navOptions
        )
        if (nextId) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextId,
          }))
          setQuestionHistory(prev => [...prev, nextId])
        } else {
          /** Parcours long : dernière étape synthétique sans question suivante dans le graphe — persister les réponses fusionnées. */
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
          }))
        }
        setIsSubmitting(false)
        return
      }

      if (
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
        (currentId === V3_SHORT_USAGE_ID || currentId === V3_FULL_USAGE_ID)
      ) {
        const sel = normalizeShortPathStageSelection(currentAnswer)
        const patches = declarativeAnswersAfterUsageStage(sel)
        const merged = {
          ...questionnaireData.answers,
          [currentId]: sel,
          ...patches,
        } as Record<string, unknown>

        await saveIndividualResponse(currentId, sel)
        for (const [qid, val] of Object.entries(patches)) {
          await saveIndividualResponse(qid, val)
        }

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }

        const nextId = getNextQuestion(
          currentId,
          merged as Record<string, any>,
          questionnaireVersion,
          navOptions
        )
        if (nextId) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextId,
          }))
          setQuestionHistory(prev => [...prev, nextId])
        }
        setIsSubmitting(false)
        return
      }

      if (
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
        (currentId === V3_SHORT_SOCIAL_ENV_ID || currentId === V3_FULL_SOCIAL_ENV_ID)
      ) {
        const sel = normalizeShortPathStageSelection(currentAnswer)
        const patches = declarativeAnswersAfterSocialEnvStage(sel)
        const merged = {
          ...questionnaireData.answers,
          [currentId]: sel,
          ...patches,
        } as Record<string, unknown>

        await saveIndividualResponse(currentId, sel)
        for (const [qid, val] of Object.entries(patches)) {
          await saveIndividualResponse(qid, val)
        }
        let e5ChecklistKeys = collectE5DeclaredOptionCodes(merged)
        let e6ChecklistKeys = collectE6DeclaredOptionCodes(merged)
        if (questionnairePathModeProp === 'short') {
          const enterpriseSel = normalizeShortPathStageSelection(merged[V3_SHORT_ENTREPRISE_ID])
          const usageSel = normalizeShortPathStageSelection(merged[V3_SHORT_USAGE_ID])
          const transSel = normalizeShortPathStageSelection(merged[V3_SHORT_TRANSPARENCE_ID])
          const socialSel = normalizeShortPathStageSelection(merged[V3_SHORT_SOCIAL_ENV_ID])
          e5ChecklistKeys = [
            ...new Set([
              ...e5ChecklistKeys,
              ...deriveMissingPenaltiesForShortPath(enterpriseSel, V3_SHORT_ENTREPRISE_ID),
              ...deriveMissingPenaltiesForShortPath(usageSel, V3_SHORT_USAGE_ID),
            ]),
          ]
          e6ChecklistKeys = [
            ...new Set([
              ...e6ChecklistKeys,
              ...deriveMissingPenaltiesForShortPath(transSel, V3_SHORT_TRANSPARENCE_ID),
              ...deriveMissingPenaltiesForShortPath(socialSel, V3_SHORT_SOCIAL_ENV_ID),
            ]),
          ]
        }
        await saveIndividualResponse(CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE, e5ChecklistKeys)
        await saveIndividualResponse(CHECKLIST_GOV_USECASE_QUESTION_CODE, e6ChecklistKeys)

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaErrorSocial } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaErrorSocial) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaErrorSocial.message)
        }

        const nextAfterSocial = getNextQuestion(
          currentId,
          merged as Record<string, any>,
          questionnaireVersion,
          navOptions
        )
        if (nextAfterSocial) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextAfterSocial,
          }))
          setQuestionHistory(prev => [...prev, nextAfterSocial])
          setIsSubmitting(false)
          return
        }

        setQuestionnaireData(prev => ({
          ...prev,
          answers: merged as Record<string, any>,
        }))

        setIsCalculatingScore(true)
        try {
          if (!session?.access_token) {
            throw new Error('Token d\'authentification manquant')
          }
          const scoreService = new ScoreService(session.access_token)
          await scoreService.calculateUseCaseScore(
            usecaseId,
            questionnairePathModeProp === 'short' ? { path_mode: 'short' } : undefined
          )
        } catch (scoreError) {
          console.error('❌ Error calculating score:', scoreError)
          setError(
            scoreError instanceof Error && scoreError.message
              ? `Erreur lors de l'enregistrement du score : ${scoreError.message}`
              : "Erreur lors de l'enregistrement du score. Veuillez réessayer."
          )
          return
        } finally {
          setIsCalculatingScore(false)
        }

        setShowProcessingAnimation(true)

        await supabase
          .from('usecases')
          .update({
            status: 'completed',
            ...(normalizeQuestionnaireVersion(questionnaireVersion) === QUESTIONNAIRE_VERSION_V3
              ? { path_mode: questionnairePathModeProp }
              : {}),
          })
          .eq('id', usecaseId)

        setIsGeneratingReport(true)
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' }
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
          }
          const reportResponse = await fetch('/api/generate-report', {
            method: 'POST',
            headers,
            body: JSON.stringify({ usecase_id: usecaseId }),
          })
          if (!reportResponse.ok) {
            const errorData = await reportResponse.json()
            if (!errorData.requires_questionnaire) {
              console.warn('⚠️ OpenAI report generation failed, but continuing...')
            }
          }
        } catch (reportError) {
          console.error('❌ Error generating OpenAI report:', reportError)
        } finally {
          setIsGeneratingReport(false)
        }

        handleProcessingComplete()

        setIsSubmitting(false)
        return
      }

      if (
        questionnaireVersion === QUESTIONNAIRE_VERSION_V3 &&
        (currentId === V3_SHORT_TRANSPARENCE_ID || currentId === V3_FULL_TRANSPARENCE_ID)
      ) {
        const sel = normalizeShortPathStageSelection(currentAnswer)
        const patches = declarativeAnswersAfterTransparenceStage(sel)
        const merged = {
          ...questionnaireData.answers,
          [currentId]: sel,
          ...patches,
        } as Record<string, unknown>

        await saveIndividualResponse(currentId, sel)
        for (const [qid, val] of Object.entries(patches)) {
          await saveIndividualResponse(qid, val)
        }
        let e5ChecklistKeys = collectE5DeclaredOptionCodes(merged)
        let e6ChecklistKeys = collectE6DeclaredOptionCodes(merged)
        if (questionnairePathModeProp === 'short') {
          const enterpriseSel = normalizeShortPathStageSelection(merged[V3_SHORT_ENTREPRISE_ID])
          const usageSel = normalizeShortPathStageSelection(merged[V3_SHORT_USAGE_ID])
          const transSel = normalizeShortPathStageSelection(merged[V3_SHORT_TRANSPARENCE_ID])
          e5ChecklistKeys = [
            ...new Set([
              ...e5ChecklistKeys,
              ...deriveMissingPenaltiesForShortPath(enterpriseSel, V3_SHORT_ENTREPRISE_ID),
              ...deriveMissingPenaltiesForShortPath(usageSel, V3_SHORT_USAGE_ID),
            ]),
          ]
          e6ChecklistKeys = [
            ...new Set([
              ...e6ChecklistKeys,
              ...deriveMissingPenaltiesForShortPath(transSel, V3_SHORT_TRANSPARENCE_ID),
            ]),
          ]
        }
        await saveIndividualResponse(CHECKLIST_GOV_ENTERPRISE_QUESTION_CODE, e5ChecklistKeys)
        await saveIndividualResponse(CHECKLIST_GOV_USECASE_QUESTION_CODE, e6ChecklistKeys)

        const fields = computeV3UsecaseQuestionnaireFields(
          merged,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }

        const nextAfterTransparency = getNextQuestion(
          currentId,
          merged as Record<string, any>,
          questionnaireVersion,
          navOptions
        )
        if (nextAfterTransparency) {
          setQuestionnaireData(prev => ({
            ...prev,
            answers: merged as Record<string, any>,
            currentQuestionId: nextAfterTransparency,
          }))
          setQuestionHistory(prev => [...prev, nextAfterTransparency])
          setIsSubmitting(false)
          return
        }

        setQuestionnaireData(prev => ({
          ...prev,
          answers: merged as Record<string, any>,
        }))

        setIsCalculatingScore(true)
        try {
          if (!session?.access_token) {
            throw new Error('Token d\'authentification manquant')
          }
          const scoreService = new ScoreService(session.access_token)
          await scoreService.calculateUseCaseScore(
            usecaseId,
            questionnairePathModeProp === 'short' ? { path_mode: 'short' } : undefined
          )
        } catch (scoreError) {
          console.error('❌ Error calculating score:', scoreError)
          setError(
            scoreError instanceof Error && scoreError.message
              ? `Erreur lors de l'enregistrement du score : ${scoreError.message}`
              : "Erreur lors de l'enregistrement du score. Veuillez réessayer."
          )
          return
        } finally {
          setIsCalculatingScore(false)
        }

        setShowProcessingAnimation(true)

        await supabase
          .from('usecases')
          .update({
            status: 'completed',
            ...(normalizeQuestionnaireVersion(questionnaireVersion) === QUESTIONNAIRE_VERSION_V3
              ? { path_mode: questionnairePathModeProp }
              : {}),
          })
          .eq('id', usecaseId)

        setIsGeneratingReport(true)
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' }
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
          }
          const reportResponse = await fetch('/api/generate-report', {
            method: 'POST',
            headers,
            body: JSON.stringify({ usecase_id: usecaseId }),
          })
          if (!reportResponse.ok) {
            const errorData = await reportResponse.json()
            if (!errorData.requires_questionnaire) {
              console.warn('⚠️ OpenAI report generation failed, but continuing...')
            }
          }
        } catch (reportError) {
          console.error('❌ Error generating OpenAI report:', reportError)
        } finally {
          setIsGeneratingReport(false)
        }

        handleProcessingComplete()

        setIsSubmitting(false)
        return
      }

      // Save current response
      await saveIndividualResponse(currentId, currentAnswer)

      const mergedAfterStep = {
        ...questionnaireData.answers,
        [currentId]: currentAnswer,
      } as Record<string, unknown>

      if (questionnaireVersion === QUESTIONNAIRE_VERSION_V2) {
        const mergedAnswers = {
          ...questionnaireData.answers,
          [questionnaireData.currentQuestionId]: currentAnswer
        }
        const fields = computeV2UsecaseQuestionnaireFields(mergedAnswers as Record<string, unknown>)
        const { error: v2MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString()
          })
          .eq('id', usecaseId)
        if (v2MetaError) {
          console.warn('Métadonnées questionnaire V2 non persistées:', v2MetaError.message)
        }
      }

      if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3) {
        const mergedAnswers = {
          ...questionnaireData.answers,
          [questionnaireData.currentQuestionId]: currentAnswer
        }
        const fields = computeV3UsecaseQuestionnaireFields(
          mergedAnswers as Record<string, unknown>,
          systemTypeProp ?? null,
          questionnairePathModeProp
        )
        const { error: v3MetaError } = await supabase
          .from('usecases')
          .update({
            bpgv_variant: fields.bpgv_variant,
            ors_exit: fields.ors_exit,
            active_question_codes: fields.active_question_codes,
            updated_at: new Date().toISOString()
          })
          .eq('id', usecaseId)
        if (v3MetaError) {
          console.warn('Métadonnées questionnaire V3 non persistées:', v3MetaError.message)
        }
      }

      if (isLastQuestion) {
        setIsCalculatingScore(true)
        try {
          if (!session?.access_token) {
            throw new Error('Token d\'authentification manquant')
          }
          const scoreService = new ScoreService(session.access_token)
          await scoreService.calculateUseCaseScore(
            usecaseId,
            questionnairePathModeProp === 'short' ? { path_mode: 'short' } : undefined
          )
        } catch (scoreError) {
          console.error('❌ Error calculating score:', scoreError)
          setError(
            scoreError instanceof Error && scoreError.message
              ? `Erreur lors de l'enregistrement du score : ${scoreError.message}`
              : "Erreur lors de l'enregistrement du score. Veuillez réessayer."
          )
          return
        } finally {
          setIsCalculatingScore(false)
        }

        setShowProcessingAnimation(true)

        await supabase
          .from('usecases')
          .update({
            status: 'completed',
            ...(normalizeQuestionnaireVersion(questionnaireVersion) === QUESTIONNAIRE_VERSION_V3
              ? { path_mode: questionnairePathModeProp }
              : {}),
          })
          .eq('id', usecaseId)

        setIsGeneratingReport(true)
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' }
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
          }
          const reportResponse = await fetch('/api/generate-report', {
            method: 'POST',
            headers,
            body: JSON.stringify({ usecase_id: usecaseId }),
          })
          if (!reportResponse.ok) {
            const errorData = await reportResponse.json()
            if (!errorData.requires_questionnaire) {
              console.warn('⚠️ OpenAI report generation failed, but continuing...')
            }
          }
        } catch (reportError) {
          console.error('❌ Error generating OpenAI report:', reportError)
        } finally {
          setIsGeneratingReport(false)
        }

        handleProcessingComplete()
      } else {
        const mergedForNav = {
          ...questionnaireData.answers,
          [questionnaireData.currentQuestionId]: currentAnswer
        }
        const nextId = getNextQuestion(
          questionnaireData.currentQuestionId,
          mergedForNav,
          questionnaireVersion,
          navOptions
        )
        if (nextId) {
          setQuestionnaireData(prev => ({
            ...prev,
            currentQuestionId: nextId
          }))
          
          setQuestionHistory(prev => [...prev, nextId])
        }
      }
    } catch (error) {
      console.error('❌ Error handling next:', error)
      const message =
        error instanceof Error && error.message.includes('Question not found')
          ? error.message
          : 'Erreur lors de la sauvegarde. Veuillez réessayer.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    canProceed,
    isSubmitting,
    questionnaireData.currentQuestionId,
    questionnaireData.answers,
    isLastQuestion,
    usecaseId,
    onComplete,
    saveIndividualResponse,
    questionnaireVersion,
    systemTypeProp,
    questionnairePathModeProp,
    navOptions,
    session?.access_token,
    handleProcessingComplete,
  ])

  const handlePrevious = useCallback(() => {
    if (!canGoBack) return

    const newHistory = [...questionHistory]
    newHistory.pop() // Remove current question
    const previousQuestionId = newHistory[newHistory.length - 1]
    
    setQuestionnaireData(prev => ({
      ...prev,
      currentQuestionId: previousQuestionId
    }))
    
    setQuestionHistory(newHistory)
    setError(null)
  }, [canGoBack, questionHistory])

  const handleSubmit = async () => {
    if (!canProceed) return
    await handleNext()
  }

  return {
    questionnaireData,
    currentQuestion,
    progress,
    nextQuestionId,
    isLastQuestion,
    canProceed,
    canGoBack,
    isSubmitting,
    isSaving,
    isCompleted: questionnaireData.isCompleted,
    isCalculatingScore,
    isGeneratingReport,
    showProcessingAnimation,
    questionnairePathMode: questionnairePathModeProp,
    error,
    handleAnswerSelect,
    setAnswerForQuestion,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleProcessingComplete
  }
} 