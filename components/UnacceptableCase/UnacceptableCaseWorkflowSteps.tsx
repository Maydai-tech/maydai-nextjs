import DateConfirmationStep from './DateConfirmationStep'
import DateEditStep from './DateEditStep'
import StoppingProofUploadStep from './StoppingProofUploadStep'

interface UnacceptableCaseWorkflowStepsProps {
  workflow: {
    step: 'confirm-date' | 'edit-date' | 'upload-proof'
    newDate: string
    nextSteps: any
    loadingNextSteps: boolean
    selectedFile: File | null
    uploadError: string | null
    updatingDate: boolean
    setNewDate: (date: string) => void
    setStep: (step: 'confirm-date' | 'edit-date' | 'upload-proof') => void
    handleModifyDate: () => void
    handleCancelEdit: () => void
    handleSaveDate: () => Promise<void>
    handleConfirmDate: () => void
    handleFileSelected: (file: File) => void
    handleUploadProof: (usecaseId: string, onSuccess?: () => void) => Promise<void>
  }
  deploymentDate?: string | null
  usecaseId: string
}

export default function UnacceptableCaseWorkflowSteps({
  workflow,
  deploymentDate,
  usecaseId
}: UnacceptableCaseWorkflowStepsProps) {
  return (
    <>
      {workflow.step === 'confirm-date' && (
        <DateConfirmationStep
          deploymentDate={deploymentDate}
          onConfirm={workflow.handleConfirmDate}
          onModify={workflow.handleModifyDate}
          disabled={workflow.updatingDate}
        />
      )}

      {workflow.step === 'edit-date' && (
        <DateEditStep
          value={workflow.newDate}
          onChange={workflow.setNewDate}
          onSave={workflow.handleSaveDate}
          onCancel={workflow.handleCancelEdit}
          saving={workflow.updatingDate}
        />
      )}

      {workflow.step === 'upload-proof' && (
        <StoppingProofUploadStep
          nextSteps={workflow.nextSteps}
          loadingNextSteps={workflow.loadingNextSteps}
          selectedFile={workflow.selectedFile}
          uploadError={workflow.uploadError}
          uploading={workflow.updatingDate}
          onFileSelected={workflow.handleFileSelected}
          onUpload={() => workflow.handleUploadProof(usecaseId)}
          onBack={() => workflow.setStep('confirm-date')}
        />
      )}
    </>
  )
}
