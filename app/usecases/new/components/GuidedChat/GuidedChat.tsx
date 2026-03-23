'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowLeft, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useGuidedChatState } from '../../hooks/useGuidedChatState'
import { useModelProviders } from '../../hooks/useModelProviders'
import { useCreateUseCase } from '../../hooks/useCreateUseCase'
import { validateDeploymentDateDDMMYYYY } from '../../lib/validators'
import { validateDraft, validateFinalClosedFieldsAgainstReferentials } from '../../lib/validators'
import { isCustomPartner as isCustomPartnerCheck } from '../../lib/model-resolver'
import { buildCreateUseCasePayload } from '../../lib/payload-builder'
import { getResponsibleServiceOptions, getAiCategoryOptions, getSystemTypeOptions } from '../../lib/referentials'
import { isoCodeToFrenchName } from '../../lib/countries'
import { CHAT_STEP_ORDER } from '../../types'
import type { ChatStepId, GuidedChatDraft } from '../../types'
import ChatMessage from './ChatMessage'
import ChatStepRenderer from './ChatStepRenderer'
import ReviewSummary from '../ReviewSummary'

interface GuidedChatProps {
  companyId: string
  company: {
    id: string
    name: string
    industry: string
    city: string
    country: string
  }
}

export default function GuidedChat({ companyId, company }: GuidedChatProps) {
  const { state, actions } = useGuidedChatState()
  const modelProviders = useModelProviders()
  const { submit, submitting, error: submitError, clearError } = useCreateUseCase()
  const [stepError, setStepError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const responsibleServiceOptions = getResponsibleServiceOptions()
  const aiCategoryOptions = getAiCategoryOptions()
  const systemTypeOptions = getSystemTypeOptions()

  // Load partners on mount
  useEffect(() => {
    modelProviders.fetchPartners()
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.currentStepId])

  const isCustom = isCustomPartnerCheck(
    state.draft.technology_partner,
    modelProviders.partners
  )

  // Compute display value for user messages (converts ISO codes to names for countries)
  const getDisplayValue = useCallback((stepId: ChatStepId): string => {
    const draft = state.draft
    switch (stepId) {
      case 'deployment_countries':
        return draft.deployment_countries.map(c => isoCodeToFrenchName(c)).join(', ')
      case 'deployment_date':
        return draft.deployment_date || '(Non renseigné)'
      default: {
        const val = draft[stepId as keyof typeof draft]
        if (Array.isArray(val)) return val.join(', ')
        return String(val || '')
      }
    }
  }, [state.draft])

  // Validate current step and advance
  const handleSubmitStep = useCallback(() => {
    setStepError('')
    const { currentStepId, draft, editingFromReview } = state

    switch (currentStepId) {
      case 'name':
        if (!draft.name.trim()) { setStepError('Le nom est requis.'); return }
        if (draft.name.length > 50) { setStepError('50 caractères maximum.'); return }
        break
      case 'deployment_date':
        if (draft.deployment_date) {
          const r = validateDeploymentDateDDMMYYYY(draft.deployment_date)
          if (!r.isValid) { setStepError(r.error!); return }
        }
        break
      case 'responsible_service':
        if (!draft.responsible_service) { setStepError('Sélectionnez un service.'); return }
        break
      case 'technology_partner':
        if (!draft.technology_partner.trim()) { setStepError('Sélectionnez un partenaire.'); return }
        break
      case 'llm_model_version':
        if (!draft.llm_model_version.trim()) { setStepError('Sélectionnez ou saisissez un modèle.'); return }
        break
      case 'ai_category':
        if (!draft.ai_category) { setStepError('Sélectionnez une catégorie.'); return }
        break
      case 'system_type':
        if (!draft.system_type) { setStepError('Sélectionnez un type.'); return }
        break
      case 'deployment_countries':
        if (draft.deployment_countries.length === 0) { setStepError('Sélectionnez au moins un pays.'); return }
        break
      case 'description':
        if (!draft.description.trim()) { setStepError('La description est requise.'); return }
        break
    }

    const displayValue = getDisplayValue(currentStepId)

    if (editingFromReview) {
      actions.returnFromEdit(displayValue)
    } else {
      const isLastFieldStep = currentStepId === CHAT_STEP_ORDER[CHAT_STEP_ORDER.length - 2]
      if (isLastFieldStep) {
        actions.goToReview(displayValue)
      } else {
        actions.goToNextStep(displayValue)
      }
    }
  }, [state, actions, getDisplayValue])

  // Handle single-select steps: set field + advance in one call (avoids stale closure)
  const handleSelectAndAdvance = useCallback((field: keyof GuidedChatDraft, value: string) => {
    actions.setFieldValue(field, value)
    setStepError('')

    if (state.editingFromReview) {
      actions.returnFromEdit(value)
    } else {
      const isLastFieldStep = state.currentStepId === CHAT_STEP_ORDER[CHAT_STEP_ORDER.length - 2]
      if (isLastFieldStep) {
        actions.goToReview(value)
      } else {
        actions.goToNextStep(value)
      }
    }
  }, [actions, state.currentStepId, state.editingFromReview])

  // Handle partner selection (fire-and-forget model loading, advance immediately)
  const handlePartnerSelect = useCallback((name: string, id?: number) => {
    actions.setFieldValue('technology_partner', name)
    actions.setFieldValue('technology_partner_id', id)
    actions.setFieldValue('llm_model_version', '')
    actions.setFieldValue('primary_model_id', null)

    if (id) {
      modelProviders.fetchModelsForProvider(id)
    } else {
      modelProviders.clearModels()
    }

    setStepError('')
    const displayValue = name
    if (state.editingFromReview) {
      actions.returnFromEdit(displayValue)
    } else {
      actions.goToNextStep(displayValue)
    }
  }, [actions, modelProviders, state.editingFromReview])

  // Handle model selection
  const handleModelSelect = useCallback((name: string, id?: string) => {
    actions.setFieldValue('llm_model_version', name)
    actions.setFieldValue('primary_model_id', id || null)

    setStepError('')
    const displayValue = name
    if (state.editingFromReview) {
      actions.returnFromEdit(displayValue)
    } else {
      actions.goToNextStep(displayValue)
    }
  }, [actions, state.editingFromReview])

  // Handle skip (only for deployment_date)
  const handleSkipStep = useCallback(() => {
    actions.setFieldValue('deployment_date', '')
    actions.skipStep(state.currentStepId)
    setStepError('')
  }, [actions, state.currentStepId])

  // Handle countries change
  const handleCountriesChange = useCallback((countries: string[]) => {
    actions.setFieldValue('deployment_countries', countries)
  }, [actions])

  // Generate description with Mistral AI
  const handleGenerateDescription = useCallback(async () => {
    actions.setGeneratingDescription(true)
    try {
      const dataToSend = {
        ...state.draft,
        company_name: company.name,
        company_industry: company.industry,
        company_city: company.city,
        company_country: company.country,
      }
      const response = await fetch('/api/mistral/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: dataToSend }),
      })
      if (!response.ok) throw new Error('Erreur de génération')
      const data = await response.json()
      actions.setFieldValue('description', data.description)
    } catch {
      setStepError('Impossible de générer la description. Saisissez-la manuellement.')
    } finally {
      actions.setGeneratingDescription(false)
    }
  }, [actions, state.draft, company])

  // Edit a field from the review screen
  const handleEditFromReview = useCallback((stepId: ChatStepId) => {
    setStepError('')
    clearError()
    actions.editFromReview(stepId)

    // Reload models if editing partner or model
    if (stepId === 'technology_partner' || stepId === 'llm_model_version') {
      if (state.draft.technology_partner_id) {
        modelProviders.fetchModelsForProvider(state.draft.technology_partner_id)
      }
    }
  }, [actions, clearError, modelProviders, state.draft.technology_partner_id])

  // Submit the use case
  const handleSubmitUseCase = useCallback(async () => {
    clearError()
    const draftResult = validateDraft(state.draft)
    if (!draftResult.isValid) {
      setStepError(draftResult.errors.map(e => e.message).join(' '))
      return
    }

    const refResult = validateFinalClosedFieldsAgainstReferentials(state.draft, {
      responsibleServices: responsibleServiceOptions,
      aiCategories: aiCategoryOptions.map(o => o.label),
      systemTypes: systemTypeOptions.map(o => o.label),
      providerNames: modelProviders.partners.map(p => p.name),
    })
    if (!refResult.isValid) {
      setStepError(refResult.errors.map(e => e.message).join(' '))
      return
    }

    const payload = buildCreateUseCasePayload(
      state.draft,
      companyId,
      modelProviders.availableModels,
      modelProviders.partners
    )

    await submit(payload)
  }, [state.draft, companyId, modelProviders, submit, clearError, responsibleServiceOptions, aiCategoryOptions, systemTypeOptions])

  const isReview = state.currentStepId === 'review'
  const currentStepIndex = CHAT_STEP_ORDER.indexOf(state.currentStepId)
  const totalFieldSteps = CHAT_STEP_ORDER.length - 1
  const progress = isReview ? 100 : ((currentStepIndex + 1) / totalFieldSteps) * 100

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="text-center mb-6">
        <Link
          href={`/dashboard/${companyId}`}
          className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Retour au dashboard</span>
        </Link>

        <div className="flex items-center justify-center mb-3">
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

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          {state.draft.name || 'Nouveau cas d\'usage IA'}
        </h1>
        <p className="text-sm text-gray-500">Registre : {company.name}</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{isReview ? 'Récapitulatif' : `Étape ${currentStepIndex + 1} / ${totalFieldSteps}`}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-[#0080A3] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {state.messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Current step input or Review */}
      {isReview ? (
        <ReviewSummary
          draft={state.draft}
          onEdit={handleEditFromReview}
          onSubmit={handleSubmitUseCase}
          submitting={submitting}
          error={submitError || stepError}
        />
      ) : (
        <div className="space-y-3">
          <ChatStepRenderer
            stepId={state.currentStepId}
            draft={state.draft}
            error={stepError}
            partners={modelProviders.partners}
            loadingPartners={modelProviders.loadingPartners}
            availableModels={modelProviders.availableModels}
            loadingModels={modelProviders.loadingModels}
            isCustomPartner={isCustom}
            isGeneratingDescription={state.isGeneratingDescription}
            responsibleServiceOptions={responsibleServiceOptions}
            aiCategoryOptions={aiCategoryOptions}
            systemTypeOptions={systemTypeOptions}
            onFieldChange={actions.setFieldValue}
            onSubmitStep={handleSubmitStep}
            onSkipStep={state.currentStepId === 'deployment_date' ? handleSkipStep : undefined}
            onSelectAndAdvance={handleSelectAndAdvance}
            onPartnerSelect={handlePartnerSelect}
            onModelSelect={handleModelSelect}
            onCountriesChange={handleCountriesChange}
            onGenerateDescription={handleGenerateDescription}
          />

          {/* Back button */}
          {currentStepIndex > 0 && !state.editingFromReview && (
            <button
              onClick={() => { setStepError(''); actions.goToPreviousStep() }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0080A3] transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Précédent
            </button>
          )}
        </div>
      )}
    </div>
  )
}

