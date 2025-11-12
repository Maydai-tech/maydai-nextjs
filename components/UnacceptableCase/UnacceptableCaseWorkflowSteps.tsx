import DateConfirmationStep from './DateConfirmationStep'
import DateEditStep from './DateEditStep'
import StoppingProofUploadStep from './StoppingProofUploadStep'
import FutureDeploymentWarningStep from './FutureDeploymentWarningStep'

interface UnacceptableCaseWorkflowStepsProps {
  workflow: {
    step: 'confirm-date' | 'edit-date' | 'upload-proof' | 'future-deployment-warning'
    newDate: string
    nextSteps: any
    loadingNextSteps: boolean
    selectedFile: File | null
    uploadError: string | null
    updatingDate: boolean
    textContent: string
    savingText: boolean
    setNewDate: (date: string) => void
    setStep: (step: 'confirm-date' | 'edit-date' | 'upload-proof' | 'future-deployment-warning') => void
    handleModifyDate: () => void
    handleCancelEdit: () => void
    handleSaveDate: () => Promise<void>
    handleConfirmDate: () => void
    handleFileSelected: (file: File) => void
    handleUploadProof: (usecaseId: string, onSuccess?: () => void) => Promise<void>
    handleUploadSystemPrompt: (usecaseId: string, onSuccess?: () => void) => Promise<void>
    handleTextChange: (text: string) => void
    handleSaveText: (usecaseId: string, onSuccess?: () => void) => Promise<void>
  }
  deploymentDate?: string | null
  usecaseId: string
  uploadedDocument?: { fileUrl: string | null; formData: Record<string, any> | null } | null
  onDeleteDocument?: () => void
  onReloadDocument?: (docKey: string) => Promise<void>
}

export default function UnacceptableCaseWorkflowSteps({
  workflow,
  deploymentDate,
  usecaseId,
  uploadedDocument,
  onDeleteDocument,
  onReloadDocument
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
          usecaseId={usecaseId}
          nextSteps={workflow.nextSteps}
          loadingNextSteps={workflow.loadingNextSteps}
          selectedFile={workflow.selectedFile}
          uploadError={workflow.uploadError}
          uploading={workflow.updatingDate}
          uploadedDocument={uploadedDocument || null}
          onFileSelected={workflow.handleFileSelected}
          onUpload={() => workflow.handleUploadProof(usecaseId, async () => {
            await onReloadDocument?.('stopping_proof')
          })}
          onDeleteDocument={onDeleteDocument || (() => {})}
          onBack={() => workflow.setStep('confirm-date')}
        />
      )}

      {workflow.step === 'future-deployment-warning' && (
        <FutureDeploymentWarningStep
          usecaseId={usecaseId}
          deploymentDate={deploymentDate}
          nextSteps={workflow.nextSteps}
          loadingNextSteps={workflow.loadingNextSteps}
          selectedFile={workflow.selectedFile}
          uploadError={workflow.uploadError}
          uploading={workflow.updatingDate}
          textContent={workflow.textContent}
          savingText={workflow.savingText}
          uploadedDocument={uploadedDocument || null}
          onFileSelected={workflow.handleFileSelected}
          onUpload={() => workflow.handleUploadSystemPrompt(usecaseId, async () => {
            await onReloadDocument?.('system_prompt')
          })}
          onTextChange={workflow.handleTextChange}
          onSaveText={() => workflow.handleSaveText(usecaseId, async () => {
            await onReloadDocument?.('system_prompt')
          })}
          onDeleteDocument={onDeleteDocument || (() => {})}
          onBack={() => workflow.setStep('confirm-date')}
          onModifyDate={() => workflow.setStep('confirm-date')}
        />
      )}
    </>
  )
}
