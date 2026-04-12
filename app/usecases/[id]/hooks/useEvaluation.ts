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
import { computeV3UsecaseQuestionnaireFields } from '../utils/questionnaire-v3-graph'
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

interface UseEvaluationReturn {
  questionnaireData: QuestionnaireData
  currentQuestion: any
  progress: any
  nextQuestionId: string | null
  isLastQuestion: boolean
  canProceed: boolean
  canGoBack: boolean
  isSubmitting: boolean
  isCompleted: boolean
  isCalculatingScore: boolean
  isGeneratingReport: boolean
  showProcessingAnimation: boolean
  /** V3 parcours court : afficher l’écran de synthèse qualification sans finaliser le cas. */
  showShortPathOutcome: boolean
  questionnairePathMode: QuestionnairePathMode
  error: string | null
  handleAnswerSelect: (answer: any) => void
  /** V3 composite : enregistrer une réponse pour un code autre que la question courante (sans changer currentQuestionId). */
  setAnswerForQuestion: (questionId: string, answer: any) => void
  handleNext: () => void
  handlePrevious: () => void
  handleSubmit: () => Promise<void>
  handleProcessingComplete: () => void
}

const E5_N9_Q7_MAYDAI_DEFAULT = {
  selected: 'E5.N9.Q7.B',
  conditionalValues: { registry_type: 'Interne', system_name: 'MaydAI' }
} as const

interface UseEvaluationProps {
  usecaseId: string
  companyId?: string
  onComplete: () => void
  /** Défaut V1 si absent (cas d’usage créés avant V2). */
  questionnaireVersion?: number | null
  /** V3 : même valeur que usecases.system_type (ex. « Produit »). */
  systemType?: string | null
  /** V3 uniquement : `short` = parcours court métier (mini-pack E5, Q12, E6 ; pivots de qualification). */
  questionnairePathMode?: QuestionnairePathMode
  /** V3 court : après calcul score initial + affichage sortie (ex. `router.refresh()`). */
  onShortPathOutcomeReady?: () => void
}

export function useEvaluation({
  usecaseId,
  companyId,
  onComplete,
  questionnaireVersion: questionnaireVersionProp,
  systemType: systemTypeProp,
  questionnairePathMode: questionnairePathModeProp = 'long',
  onShortPathOutcomeReady,
}: UseEvaluationProps): UseEvaluationReturn {
  const questionnaireVersion: QuestionnaireVersion = useMemo(
    () => normalizeQuestionnaireVersion(questionnaireVersionProp),
    [questionnaireVersionProp]
  )
  const { session } = useAuth()
  const [company, setCompany] = useState<{ maydai_as_registry?: boolean } | null>(null)
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    currentQuestionId: 'E4.N7.Q1',
    answers: {},
    isCompleted: false
  })
  
  const [questionHistory, setQuestionHistory] = useState<string[]>(['E4.N7.Q1'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showProcessingAnimation, setShowProcessingAnimation] = useState(false)
  const [showShortPathOutcome, setShowShortPathOutcome] = useState(false)

  const {
    formattedAnswers: savedAnswers,
    loading: loadingResponses,
    saveResponse,
    refreshResponses
  } = useQuestionnaireResponses(usecaseId)

  // Fetch company for MaydAI registry default
  useEffect(() => {
    if (!companyId || !session?.access_token) return
    let cancelled = false
    fetch(`/api/companies/${companyId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data) setCompany(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [companyId, session?.access_token])

  // Load initial data once
  useEffect(() => {
    if (!initialDataLoaded && !loadingResponses) {
      console.log('🔄 Loading initial data from saved responses:', savedAnswers)

      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        const navOpts =
          questionnaireVersion === QUESTIONNAIRE_VERSION_V3
            ? {
                systemType: systemTypeProp ?? null,
                pathMode: questionnairePathModeProp,
              }
            : undefined
        const currentQuestionId = getResumeQuestionId(
          savedAnswers,
          questionnaireVersion,
          navOpts
        )

        setQuestionnaireData(prev => ({
          ...prev,
          answers: { ...savedAnswers },
          currentQuestionId
        }))

        const historyPath = buildQuestionPath(
          currentQuestionId,
          savedAnswers,
          questionnaireVersion,
          navOpts
        )
        setQuestionHistory(historyPath.length > 0 ? historyPath : ['E4.N7.Q1'])

        console.log('📍 Setting current question to:', currentQuestionId)
      } else {
        console.log('📍 No saved responses, starting from first question')
        setQuestionnaireData(prev => ({
          ...prev,
          currentQuestionId: 'E4.N7.Q1',
          answers: {}
        }))
        setQuestionHistory(['E4.N7.Q1'])
      }

      setInitialDataLoaded(true)
    }
  }, [
    savedAnswers,
    loadingResponses,
    initialDataLoaded,
    questionnaireVersion,
    systemTypeProp,
    questionnairePathModeProp,
  ])

  // Pre-fill E5.N9.Q7 (V1 uniquement — en V2 l’E5 intervient après l’ORS)
  useEffect(() => {
    if (questionnaireVersion === QUESTIONNAIRE_VERSION_V2 || questionnaireVersion === QUESTIONNAIRE_VERSION_V3)
      return
    if (!company?.maydai_as_registry || !initialDataLoaded) return
    setQuestionnaireData(prev => {
      if (prev.answers['E5.N9.Q7']) return prev
      return {
        ...prev,
        answers: {
          ...prev.answers,
          'E5.N9.Q7': { ...E5_N9_Q7_MAYDAI_DEFAULT }
        }
      }
    })
  }, [company?.maydai_as_registry, initialDataLoaded, questionnaireVersion])

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
    console.log(`📝 Answer selected for ${questionnaireData.currentQuestionId}:`, answer)
    
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
        if (answer === 'E4.N7.Q1.A') delete nextAnswers['E4.N7.Q1.2']
        if (answer === 'E4.N7.Q1.B') delete nextAnswers['E4.N7.Q1.1']
      }
      if (questionId === 'E4.N8.Q11.0' && answer === 'E4.N8.Q11.0.B') {
        delete nextAnswers['E4.N8.Q11.1']
      }
      return { ...prev, answers: nextAnswers }
    })
    setError(null)
  }, [])

  const saveIndividualResponse = useCallback(async (questionId: string, answer: any) => {
    try {
      console.log(`💾 Saving response for ${questionId}:`, answer)
      
      // Use the proper saveResponse method from useQuestionnaireResponses
      const questions = loadQuestions()
      const question = questions[questionId]
      if (!question) {
        throw new Error(`Question not found: ${questionId}`)
      }

      if (question.type === 'radio') {
        await saveResponse(questionId, answer)
      } else if (question.type === 'checkbox' || question.type === 'tags') {
        await saveResponse(questionId, undefined, { 
          selected_codes: answer,
          selected_labels: answer?.map((code: string) => {
            const option = question.options.find(opt => opt.code === code)
            return option?.label || code
          }) || []
        })
      } else if (question.type === 'conditional') {
        await saveResponse(questionId, undefined, answer)
      } else {
        // Fallback for other types
        await saveResponse(questionId, undefined, answer)
      }
      
      console.log(`✅ Successfully saved response for ${questionId}`)
      
    } catch (error) {
      console.error('❌ Error in saveIndividualResponse:', error)
      throw error
    }
  }, [saveResponse])

  const handleNext = useCallback(async () => {
    if (!canProceed || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const currentId = questionnaireData.currentQuestionId
      const currentAnswer = questionnaireData.answers[currentId]

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

      // Save current response
      await saveIndividualResponse(currentId, currentAnswer)

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
        console.log('🏁 Fin de questionnaire sur la question courante')

        if (questionnaireVersion === QUESTIONNAIRE_VERSION_V3 && questionnairePathModeProp === 'short') {
          console.log('🧮 Parcours court V3 — score initial (périmètre court uniquement)')
          setIsCalculatingScore(true)
          try {
            if (!session?.access_token) {
              throw new Error('Token d\'authentification manquant')
            }
            const scoreService = new ScoreService(session.access_token)
            const scoreResult = await scoreService.calculateUseCaseScore(usecaseId, { path_mode: 'short' })
            console.log('✅ Score initial parcours court enregistré:', scoreResult)
          } catch (shortScoreErr) {
            console.error('❌ Erreur calcul score initial parcours court:', shortScoreErr)
          } finally {
            setIsCalculatingScore(false)
          }
          onShortPathOutcomeReady?.()
          setShowShortPathOutcome(true)
          setIsSubmitting(false)
          return
        }

        console.log('🧮 Calculating use case score...')
        setIsCalculatingScore(true)
        try {
          if (!session?.access_token) {
            throw new Error('Token d\'authentification manquant')
          }
          const scoreService = new ScoreService(session.access_token)
          const scoreResult = await scoreService.calculateUseCaseScore(usecaseId)
          console.log('✅ Score calculated successfully:', scoreResult)
        } catch (scoreError) {
          console.error('❌ Error calculating score:', scoreError)
        } finally {
          setIsCalculatingScore(false)
        }

        console.log('🏁 Finalisation parcours long')
        setShowProcessingAnimation(true)

        await supabase.from('usecases').update({ status: 'completed' }).eq('id', usecaseId)

        console.log('🤖 Generating OpenAI report automatically...')
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
          if (reportResponse.ok) {
            console.log('✅ OpenAI report generated successfully')
          } else {
            const errorData = await reportResponse.json()
            if (errorData.requires_questionnaire) {
              console.log('ℹ️ Questionnaire incomplet, rapport non généré')
            } else {
              console.warn('⚠️ OpenAI report generation failed, but continuing...')
            }
          }
        } catch (reportError) {
          console.error('❌ Error generating OpenAI report:', reportError)
        } finally {
          setIsGeneratingReport(false)
        }
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
          console.log(`➡️ Moving to next question: ${nextId}`)
          
          setQuestionnaireData(prev => ({
            ...prev,
            currentQuestionId: nextId
          }))
          
          setQuestionHistory(prev => [...prev, nextId])
        }
      }
    } catch (error) {
      console.error('❌ Error handling next:', error)
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.')
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
    onShortPathOutcomeReady,
  ])

  const handlePrevious = useCallback(() => {
    if (!canGoBack) return

    const newHistory = [...questionHistory]
    newHistory.pop() // Remove current question
    const previousQuestionId = newHistory[newHistory.length - 1]
    
    console.log(`⬅️ Going back to: ${previousQuestionId}`)
    
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

  const handleProcessingComplete = useCallback(() => {
    console.log('🎉 Processing animation completed')
    setShowProcessingAnimation(false)
    setQuestionnaireData(prev => ({ ...prev, isCompleted: true }))
    setTimeout(() => {
      onComplete()
    }, 500)
  }, [onComplete])

  return {
    questionnaireData,
    currentQuestion,
    progress,
    nextQuestionId,
    isLastQuestion,
    canProceed,
    canGoBack,
    isSubmitting,
    isCompleted: questionnaireData.isCompleted,
    isCalculatingScore,
    isGeneratingReport,
    showProcessingAnimation,
    showShortPathOutcome,
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