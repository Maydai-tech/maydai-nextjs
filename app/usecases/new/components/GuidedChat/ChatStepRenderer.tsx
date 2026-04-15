'use client'

import type { GuidedChatDraft, ChatStepId, ModelProviderOption, ModelOption, ClosedFieldOption } from '../../types'
import TextInputStep from './steps/TextInputStep'
import DeploymentPhaseDateStep from './steps/DeploymentPhaseDateStep'
import SingleSelectStep from './steps/SingleSelectStep'
import PartnerSelectStep from './steps/PartnerSelectStep'
import ModelSelectStep from './steps/ModelSelectStep'
import CountrySelectStep from './steps/CountrySelectStep'
import DescriptionStep from './steps/DescriptionStep'

interface ChatStepRendererProps {
  stepId: ChatStepId
  draft: GuidedChatDraft
  error?: string
  partners: ModelProviderOption[]
  loadingPartners: boolean
  availableModels: ModelOption[]
  loadingModels: boolean
  isCustomPartner: boolean
  isGeneratingDescription: boolean
  responsibleServiceOptions: string[]
  aiCategoryOptions: ClosedFieldOption[]
  systemTypeOptions: ClosedFieldOption[]
  onFieldChange: <K extends keyof GuidedChatDraft>(field: K, value: GuidedChatDraft[K]) => void
  onSubmitStep: () => void
  onSkipStep?: () => void
  onSelectAndAdvance: (field: keyof GuidedChatDraft, value: string) => void
  onPartnerSelect: (name: string, id?: number) => void
  onModelSelect: (name: string, id?: string) => void
  onCountriesChange: (countries: string[]) => void
  onGenerateDescription?: () => void
}

export default function ChatStepRenderer({
  stepId,
  draft,
  error,
  partners,
  loadingPartners,
  availableModels,
  loadingModels,
  isCustomPartner,
  isGeneratingDescription,
  responsibleServiceOptions,
  aiCategoryOptions,
  systemTypeOptions,
  onFieldChange,
  onSubmitStep,
  onSkipStep,
  onSelectAndAdvance,
  onPartnerSelect,
  onModelSelect,
  onCountriesChange,
  onGenerateDescription,
}: ChatStepRendererProps) {
  switch (stepId) {
    case 'name':
      return (
        <TextInputStep
          value={draft.name}
          onChange={(v) => onFieldChange('name', v)}
          onSubmit={onSubmitStep}
          placeholder="ex: Système IA Anti-Fraude"
          maxLength={50}
          error={error}
        />
      )

    case 'deployment_date':
      return (
        <DeploymentPhaseDateStep
          phaseValue={draft.deployment_phase}
          dateValue={draft.deployment_date}
          onPhaseChange={(v) => onFieldChange('deployment_phase', v)}
          onDateChange={(v) => onFieldChange('deployment_date', v)}
          onSubmit={onSubmitStep}
          onSkip={onSkipStep}
          error={error}
        />
      )

    case 'responsible_service':
      return (
        <SingleSelectStep
          options={responsibleServiceOptions}
          value={draft.responsible_service}
          onSelect={(v) => onSelectAndAdvance('responsible_service', v)}
          error={error}
          columns={2}
        />
      )

    case 'technology_partner':
      return (
        <PartnerSelectStep
          partners={partners}
          value={draft.technology_partner}
          onSelect={onPartnerSelect}
          loading={loadingPartners}
          error={error}
        />
      )

    case 'llm_model_version':
      return (
        <ModelSelectStep
          models={availableModels}
          value={draft.llm_model_version}
          onSelect={onModelSelect}
          isCustomPartner={isCustomPartner}
          partnerName={draft.technology_partner}
          loading={loadingModels}
          error={error}
        />
      )

    case 'ai_category':
      return (
        <SingleSelectStep
          options={aiCategoryOptions}
          value={draft.ai_category}
          onSelect={(v) => onSelectAndAdvance('ai_category', v)}
          error={error}
        />
      )

    case 'system_type':
      return (
        <SingleSelectStep
          options={systemTypeOptions}
          value={draft.system_type}
          onSelect={(v) => onSelectAndAdvance('system_type', v)}
          error={error}
        />
      )

    case 'deployment_countries':
      return (
        <CountrySelectStep
          selectedCountries={draft.deployment_countries}
          onChange={onCountriesChange}
          onSubmit={onSubmitStep}
          error={error}
        />
      )

    case 'description':
      return (
        <DescriptionStep
          value={draft.description}
          onChange={(v) => onFieldChange('description', v)}
          onSubmit={onSubmitStep}
          onGenerateAI={onGenerateDescription}
          isGenerating={isGeneratingDescription}
          canGenerate={!!draft.name && !!draft.ai_category}
          error={error}
        />
      )

    case 'review':
      return null

    default:
      return null
  }
}
