import { Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils/dateFormatters";

interface DateConfirmationStepProps {
  deploymentDate: string | null | undefined;
  onConfirm: () => void;
  onModify: () => void;
  disabled?: boolean;
}

export default function DateConfirmationStep({
  deploymentDate,
  onConfirm,
  onModify,
  disabled = false,
}: DateConfirmationStepProps) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-start space-x-3 mb-4">
        <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 mb-2">
            Vérification de la date de déploiement
          </p>
          <div className="bg-white p-3 rounded-lg border border-blue-300 mb-3">
            <p className="text-xs text-gray-500 mb-1">Date actuelle :</p>
            <p className="text-base font-semibold text-gray-900">
              {formatDate(deploymentDate)}
            </p>
          </div>
          <p className="text-sm text-blue-800">
            Cette date est-elle correcte ?
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Oui, la date est bonne
        </button>
        <button
          onClick={onModify}
          disabled={disabled}
          className="flex-1 px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Modifier la date
        </button>
      </div>
    </div>
  );
}
