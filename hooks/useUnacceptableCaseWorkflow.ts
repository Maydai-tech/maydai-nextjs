import { useState, useEffect } from "react";
import { useApiCall } from "@/lib/api-client-legacy";
import { formatDateForInput } from "@/lib/utils/dateFormatters";
import { supabase } from "@/lib/supabase";

interface UseCaseNextSteps {
  evaluation?: string;
  introduction?: string;
  impact?: string;
  conclusion?: string;
}

type WorkflowStep =
  | "confirm-date"
  | "edit-date"
  | "upload-proof"
  | "future-deployment-warning";

interface UseUnacceptableCaseWorkflowProps {
  useCase: {
    id: string;
    name: string;
    risk_level?: string;
    score_final?: number | null;
    deployment_date?: string | null;
  } | null;
  isOpen?: boolean;
  onUpdateDeploymentDate?: (date: string) => Promise<void>;
  initialProofUploaded?: boolean;
  onReloadDocument?: (docType: string) => Promise<void>;
}

export function useUnacceptableCaseWorkflow({
  useCase,
  isOpen = true,
  onUpdateDeploymentDate,
  initialProofUploaded = false,
  onReloadDocument,
}: UseUnacceptableCaseWorkflowProps) {
  const api = useApiCall();
  const [step, setStep] = useState<WorkflowStep>("confirm-date");
  const [newDate, setNewDate] = useState("");
  const [nextSteps, setNextSteps] = useState<UseCaseNextSteps | null>(null);
  const [loadingNextSteps, setLoadingNextSteps] = useState(false);
  const [nextStepsError, setNextStepsError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [updatingDate, setUpdatingDate] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(initialProofUploaded);
  const [textContent, setTextContent] = useState("");
  const [savingText, setSavingText] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Charger les next steps quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && useCase && !nextSteps && !loadingNextSteps && !nextStepsError) {
      console.log("Loading nextsteps for useCase:", useCase.id);
      setLoadingNextSteps(true);
      api
        .get(`/api/usecases/${useCase.id}/nextsteps`)
        .then((result) => {
          console.log("NextSteps loaded:", result.data);
          if (result.data) {
            setNextSteps(result.data);
          }
        })
        .catch((error) => {
          console.error("Error loading next steps:", error);
          setNextStepsError(true);
        })
        .finally(() => {
          setLoadingNextSteps(false);
        });
    }
  }, [isOpen, useCase, api, nextSteps, loadingNextSteps, nextStepsError]);

  // Synchroniser proofUploaded avec initialProofUploaded (gère upload ET suppression)
  useEffect(() => {
    setProofUploaded(initialProofUploaded);
  }, [initialProofUploaded]);

  const handleModifyDate = () => {
    if (!useCase) return;
    setNewDate(formatDateForInput(useCase.deployment_date));
    setStep("edit-date");
  };

  const handleCancelEdit = () => {
    setNewDate("");
    setStep("confirm-date");
  };

  const handleSaveDate = async () => {
    if (!newDate || !onUpdateDeploymentDate) return;

    try {
      setUpdatingDate(true);
      await onUpdateDeploymentDate(newDate);
      setNewDate("");
      setStep("confirm-date");
    } catch (error) {
      console.error("Error updating deployment date:", error);
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleConfirmDate = () => {
    if (!useCase?.deployment_date) {
      console.log("Pas de date de déploiement définie");
      return;
    }

    const deploymentDate = new Date(useCase.deployment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("Deployment date:", deploymentDate);
    console.log("Today:", today);
    console.log("Is in past?", deploymentDate < today);

    if (deploymentDate < today) {
      console.log("Date dans le passé, passage à upload-proof");
      setStep("upload-proof");
    } else {
      console.log("Date dans le futur, passage à future-deployment-warning");
      setStep("future-deployment-warning");
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUploadProof = async (
    usecaseId: string,
    onSuccess?: () => void,
  ) => {
    if (!selectedFile || !useCase) return;

    try {
      setUpdatingDate(true);
      setUploadError(null);

      // Get token directly from supabase (same pattern as DossierDetailPage)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUploadError("Session expirée");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(
        `/api/dossiers/${usecaseId}/stopping_proof/upload`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        },
      );

      if (res.ok) {
        setProofUploaded(true);
        onSuccess?.();
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        setUploadError(errorData.error || "Erreur lors de l'upload");
      }
    } catch (error: any) {
      console.error("Error uploading proof:", error);
      setUploadError(error?.message || "Erreur lors de l'upload du document");
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleUploadSystemPrompt = async (
    usecaseId: string,
    onSuccess?: () => void,
  ) => {
    if (!selectedFile || !useCase) return;

    try {
      setUpdatingDate(true);
      setUploadError(null);

      // Get token directly from supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUploadError("Session expirée");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(
        `/api/dossiers/${usecaseId}/system_prompt/upload`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        },
      );

      if (res.ok) {
        setProofUploaded(true);
        onSuccess?.();
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        setUploadError(errorData.error || "Erreur lors de l'upload");
      }
    } catch (error: any) {
      console.error("Error uploading system prompt:", error);
      setUploadError(error?.message || "Erreur lors de l'upload du document");
    } finally {
      setUpdatingDate(false);
    }
  };

  const handleTextChange = (text: string) => {
    setTextContent(text);
    setUploadError(null);
  };

  const handleSaveText = async (usecaseId: string, onSuccess?: () => void) => {
    if (!textContent.trim() || !useCase) return;

    try {
      setSavingText(true);
      setUploadError(null);

      // Get token directly from supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUploadError("Session expirée");
        return;
      }

      const res = await fetch(`/api/dossiers/${usecaseId}/system_prompt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: { system_instructions: textContent },
          status: "complete",
        }),
      });

      if (res.ok) {
        setProofUploaded(true);
        onSuccess?.();
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        setUploadError(errorData.error || "Erreur lors de l'enregistrement");
      }
    } catch (error: any) {
      console.error("Error saving text:", error);
      setUploadError(
        error?.message || "Erreur lors de l'enregistrement du texte",
      );
    } finally {
      setSavingText(false);
    }
  };

  const handleDeleteDocument = async (
    usecaseId: string,
    docType: "stopping_proof" | "system_prompt",
  ) => {
    if (!useCase) return;

    try {
      setDeleting(true);
      setUploadError(null);

      // Get token directly from supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUploadError("Session expirée");
        return;
      }

      const res = await fetch(`/api/dossiers/${usecaseId}/${docType}/upload`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        // Reset workflow state
        setProofUploaded(false);
        setSelectedFile(null);
        setTextContent("");

        // Reload document in parent component
        if (onReloadDocument) {
          await onReloadDocument(docType);
        }
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Erreur inconnue" }));
        setUploadError(errorData.error || "Erreur lors de la suppression");
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      setUploadError(
        error?.message || "Erreur lors de la suppression du document",
      );
    } finally {
      setDeleting(false);
    }
  };

  const reset = () => {
    setStep("confirm-date");
    setNewDate("");
    setSelectedFile(null);
    setUploadError(null);
    setNextSteps(null);
    setNextStepsError(false);
    setProofUploaded(false);
    setTextContent("");
    setDeleting(false);
  };

  return {
    step,
    newDate,
    nextSteps,
    loadingNextSteps,
    selectedFile,
    uploadError,
    updatingDate,
    proofUploaded,
    textContent,
    savingText,
    deleting,
    setNewDate,
    setStep,
    setProofUploaded,
    handleModifyDate,
    handleCancelEdit,
    handleSaveDate,
    handleConfirmDate,
    handleFileSelected,
    handleUploadProof,
    handleUploadSystemPrompt,
    handleTextChange,
    handleSaveText,
    handleDeleteDocument,
    reset,
  };
}
