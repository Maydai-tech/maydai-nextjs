import { AlertTriangle, Upload } from 'lucide-react'
import ComplianceFileUpload from '@/components/ComplianceFileUpload'

interface UseCaseNextSteps {
  evaluation?: string
  introduction?: string
  impact?: string
  conclusion?: string
}

interface StoppingProofUploadStepProps {
  nextSteps: UseCaseNextSteps | null
  loadingNextSteps: boolean
  selectedFile: File | null
  uploadError: string | null
  uploading: boolean
  onFileSelected: (file: File) => void
  onUpload: () => void
  onBack: () => void
}

export default function StoppingProofUploadStep({
  nextSteps,
  loadingNextSteps,
  selectedFile,
  uploadError,
  uploading,
  onFileSelected,
  onUpload,
  onBack
}: StoppingProofUploadStepProps) {
  return (
    <div className="space-y-4">
      {/* Loading indicator */}
      {loadingNextSteps && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0080A3] mr-3"></div>
          <p className="text-gray-600">Chargement des informations...</p>
        </div>
      )}

      {/* Evaluation du risque */}
      {!loadingNextSteps && nextSteps?.evaluation && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <h4 className="font-semibold text-red-900">Justification du niveau de risque</h4>
          </div>
          <div className="text-sm text-red-800 whitespace-pre-wrap pl-7">
            {nextSteps.evaluation}
          </div>
        </div>
      )}

      {/* Message si pas d'évaluation disponible */}
      {!loadingNextSteps && !nextSteps?.evaluation && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Aucune évaluation du risque disponible pour ce cas d'usage.
            </p>
          </div>
        </div>
      )}

      {/* Message d'arrêt obligatoire */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-900">
            <p className="font-semibold mb-2">Arrêt obligatoire du cas d'usage</p>
            <p>
              La date de déploiement étant dans le passé, vous devez fournir une preuve
              documentaire de l'arrêt effectif de l'utilisation de ce cas d'usage.
            </p>
          </div>
        </div>
      </div>

      {/* Upload de la preuve */}
      <div className="bg-white p-4 rounded-lg border border-gray-300">
        <ComplianceFileUpload
          label="Preuve d'arrêt du cas d'usage"
          helpText="Téléchargez un document prouvant l'arrêt de l'utilisation (PDF, image)"
          acceptedFormats=".pdf,.png,.jpg,.jpeg"
          onFileSelected={onFileSelected}
        />

        {uploadError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 pt-2">
        <button
          onClick={onBack}
          disabled={uploading}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Retour
        </button>
        <button
          onClick={onUpload}
          disabled={uploading || !selectedFile}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Télécharger la preuve
            </>
          )}
        </button>
      </div>
    </div>
  )
}
