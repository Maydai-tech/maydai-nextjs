'use client'

import { X, AlertTriangle } from 'lucide-react'
import { useUnacceptableCaseWorkflow } from '@/hooks/useUnacceptableCaseWorkflow'
import UnacceptableCaseWorkflowSteps from '@/components/UnacceptableCase/UnacceptableCaseWorkflowSteps'

interface UnacceptableCaseModalProps {
  isOpen: boolean
  onClose: () => void
  useCase: {
    id: string
    name: string
    risk_level?: string
    score_final?: number | null
    deployment_date?: string | null
  } | null
  companyId: string
  onUpdateDeploymentDate?: (date: string) => Promise<void>
  updating?: boolean
  blockClosing?: boolean
  onReloadDocument?: (docKey: string) => Promise<void>
  uploadedDocument?: { fileUrl: string | null; formData: Record<string, any> | null } | null
}

export default function UnacceptableCaseModal({
  isOpen,
  onClose,
  useCase,
  companyId,
  onUpdateDeploymentDate,
  updating = false,
  blockClosing = false,
  onReloadDocument,
  uploadedDocument
}: UnacceptableCaseModalProps) {
  const workflow = useUnacceptableCaseWorkflow({
    useCase,
    isOpen,
    onUpdateDeploymentDate,
    onReloadDocument
  })

  if (!isOpen || !useCase) return null

  const handleClose = () => {
    workflow.reset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={blockClosing ? undefined : handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 transform transition-all duration-200 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto p-8 flex-1"
          style={{
            scrollbarGutter: 'stable',
            scrollbarWidth: 'thin'
          }}
        >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Cas Inacceptable</h3>
          </div>
          {!blockClosing && (
            <button
              onClick={handleClose}
              disabled={updating || workflow.updatingDate}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Use Case Name */}
          <div>
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Cas d'usage :
            </label>
            <p className="mt-1 text-lg font-semibold text-gray-900">{useCase.name}</p>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                Ce cas d'usage presente un niveau de risque inacceptable selon l'AI Act.
                Vous devez procéder à une analyse approfondie de la conformité de ce cas d'usage.
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          <UnacceptableCaseWorkflowSteps
            workflow={workflow}
            deploymentDate={useCase.deployment_date}
            usecaseId={useCase.id}
            companyId={companyId}
            uploadedDocument={uploadedDocument}
            onReloadDocument={onReloadDocument}
          />
        </div>

        {/* Actions - Fermer uniquement en mode confirmation et si non bloquant */}
        {workflow.step === 'confirm-date' && !blockClosing && (
          <div className="mt-8">
            <button
              onClick={handleClose}
              disabled={updating || workflow.updatingDate}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fermer
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
