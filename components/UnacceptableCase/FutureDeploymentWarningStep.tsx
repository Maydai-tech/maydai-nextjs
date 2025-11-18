import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Upload,
  Edit,
  Check,
  FileText,
  Eye,
  Calendar,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ComplianceFileUpload from "@/components/ComplianceFileUpload";
import MarkdownText from "@/components/Shared/MarkdownText";
import { formatDate } from "@/lib/utils/dateFormatters";

interface UseCaseNextSteps {
  evaluation?: string;
  introduction?: string;
  impact?: string;
  conclusion?: string;
}

interface FutureDeploymentWarningStepProps {
  usecaseId: string;
  deploymentDate: string | null | undefined;
  nextSteps: UseCaseNextSteps | null;
  loadingNextSteps: boolean;
  selectedFile: File | null;
  uploadError: string | null;
  uploading: boolean;
  textContent: string;
  savingText: boolean;
  uploadedDocument: {
    fileUrl: string | null;
    formData: Record<string, any> | null;
  } | null;
  onFileSelected: (file: File) => void;
  onUpload: () => void;
  onTextChange: (text: string) => void;
  onSaveText: () => void;
  onDeleteDocument: () => void;
  onBack: () => void;
  onModifyDate: () => void;
}

export default function FutureDeploymentWarningStep({
  usecaseId,
  deploymentDate,
  nextSteps,
  loadingNextSteps,
  selectedFile,
  uploadError,
  uploading,
  textContent,
  savingText,
  uploadedDocument,
  onFileSelected,
  onUpload,
  onTextChange,
  onSaveText,
  onDeleteDocument,
  onBack,
  onModifyDate,
}: FutureDeploymentWarningStepProps) {
  const router = useRouter();
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if document is uploaded (either file or text)
  const hasUploadedDocument =
    uploadedDocument && (uploadedDocument.fileUrl || uploadedDocument.formData);

  // Reset confirmation after 3 seconds
  useEffect(() => {
    if (confirmDelete) {
      timeoutRef.current = setTimeout(() => {
        setConfirmDelete(false);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [confirmDelete]);

  const handleEditEvaluation = () => {
    router.push(`/usecases/${usecaseId}/evaluation`);
  };

  const handleEditDocument = () => {
    // Pré-remplir le textarea avec le contenu existant
    if (uploadedDocument?.formData?.system_instructions) {
      onTextChange(uploadedDocument.formData.system_instructions);
    }
    setIsEditingDocument(true);
  };

  const handleCancelEdit = () => {
    setIsEditingDocument(false);
    // Optionnel : vider le textarea à l'annulation
    onTextChange("");
  };

  const handleSaveText = async () => {
    await onSaveText();
    // Désactiver le mode édition après la sauvegarde
    setIsEditingDocument(false);
  };

  const handleUpload = async () => {
    await onUpload();
    // Désactiver le mode édition après l'upload
    setIsEditingDocument(false);
  };

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDeleteDocument();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const handleBlur = () => {
    // Reset on blur
    setTimeout(() => setConfirmDelete(false), 200);
  };

  return (
    <div className="space-y-4">
      {/* Date de déploiement avec possibilité de modifier */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Date de déploiement prévue
              </p>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(deploymentDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onModifyDate}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            title="Modifier la date de déploiement"
          >
            <Edit className="w-4 h-4 mr-1" />
            Modifier
          </button>
        </div>
      </div>

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
            <h4 className="font-semibold text-red-900">
              Justification du niveau de risque
            </h4>
          </div>
          <MarkdownText
            text={nextSteps.evaluation}
            className="text-sm text-red-800 pl-7 mb-4"
          />
          <div className="pl-7 pt-3 border-t border-red-200">
            <p className="text-sm text-red-800 mb-3">
              Si vous pensez que cette évaluation ne décrit pas correctement
              votre cas d'usage, vous pouvez modifier vos réponses au
              questionnaire pour obtenir une nouvelle analyse.
            </p>
            <button
              onClick={handleEditEvaluation}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier l'évaluation</span>
            </button>
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

      {/* Message d'avertissement pour déploiement futur */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-900">
            <p className="font-semibold mb-2">
              ⚠️ Ce système ne doit PAS être déployé en l'état
            </p>
            <p className="mb-2">
              Ce cas d'usage présente un{" "}
              <strong>niveau de risque inacceptable</strong> selon l'AI Act. La
              date de déploiement prévue étant dans le futur, vous devez
              impérativement :
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Revoir votre évaluation des risques</li>
              <li>Modifier votre système pour réduire le niveau de risque</li>
              <li>Ou abandonner ce cas d'usage</li>
            </ul>
            <p className="font-semibold">
              Le déploiement d'un système à risque inacceptable est interdit par
              l'AI Act.
            </p>
          </div>
        </div>
      </div>

      {/* Message explicatif pour le document */}
      {!hasUploadedDocument && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Documentation requise</p>
              <p>
                Pour tracer votre démarche de conformité, veuillez fournir les
                instructions système (prompts) actuellement utilisées ou prévues
                pour ce cas d'usage. Cela permettra de documenter l'état actuel
                avant toute modification nécessaire pour réduire le risque.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Display uploaded document */}
      {hasUploadedDocument && !isEditingDocument && (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">
                  Document enregistré
                </h4>
                <p className="text-sm text-green-800">
                  Les instructions système ont été enregistrées avec succès.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditDocument}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                title="Modifier le document"
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifier
              </button>
              <button
                onClick={handleDeleteClick}
                onBlur={handleBlur}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                  confirmDelete
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
                title={
                  confirmDelete
                    ? "Confirmer la suppression"
                    : "Supprimer le document"
                }
              >
                {confirmDelete ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Supprimer ?
                  </>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Display uploaded content */}
          <div className="bg-white p-4 rounded-lg border border-green-300">
            {uploadedDocument?.fileUrl ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier uploadé
                </label>
                <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-blue-900 font-medium flex-1">
                    {uploadedDocument.fileUrl.split("/").pop()?.split("?")[0] ||
                      "Document"}
                  </span>
                  <a
                    href={uploadedDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Voir le document"
                  >
                    <Eye className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ) : uploadedDocument?.formData?.system_instructions ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions Système
                </label>
                <div className="max-h-64 overflow-y-auto bg-gray-50 p-3 rounded border border-gray-300">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                    {uploadedDocument.formData.system_instructions}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Saisie manuelle du prompt système */}
      {(!hasUploadedDocument || isEditingDocument) && (
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructions Système et Prompts Principaux
          </label>
          <textarea
            value={textContent}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Collez ici l'intégralité du prompt système..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent font-mono text-sm"
            rows={8}
          />
        </div>
      )}

      {/* Séparateur OU */}
      {(!hasUploadedDocument || isEditingDocument) && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-sm text-gray-500 font-medium">OU</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
      )}

      {/* Upload de fichier */}
      {(!hasUploadedDocument || isEditingDocument) && (
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <ComplianceFileUpload
            label="Importer un fichier"
            helpText="Formats acceptés: .txt, .md"
            acceptedFormats=".txt,.md"
            onFileSelected={onFileSelected}
            onFileRemoved={() => onFileSelected(null as any)}
          />

          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}
        </div>
      )}

      {/* Boutons d'action uniques pour le mode édition */}
      {(!hasUploadedDocument || isEditingDocument) && (
        <div className="space-y-3">
          {/* Message d'avertissement si texte ET fichier sélectionnés */}
          {textContent.trim() && selectedFile && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ Vous devez choisir entre le texte ou le fichier. Veuillez
                vider le champ de texte ou retirer le fichier sélectionné.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {/* Bouton Enregistrer le texte - uniquement si pas de fichier sélectionné */}
            {textContent.trim() && !selectedFile && (
              <button
                onClick={handleSaveText}
                disabled={savingText}
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingText ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            )}

            {/* Bouton Upload fichier - uniquement si pas de texte saisi */}
            {selectedFile && !textContent.trim() && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </button>
            )}

            {/* Bouton Annuler - uniquement en mode édition */}
            {isEditingDocument && (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
