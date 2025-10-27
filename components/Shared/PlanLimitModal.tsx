'use client';

import { X, AlertCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ResourceType = 'registry' | 'usecase' | 'collaborator';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  maxLimit: number;
  planName: string;
  resourceType: ResourceType;
  customMessage?: string;
}

const getResourceText = (resourceType: ResourceType, count: number): string => {
  switch (resourceType) {
    case 'registry':
      return count === 1 ? 'registre' : 'registres';
    case 'usecase':
      return count === 1 ? 'cas d\'usage' : 'cas d\'usage';
    case 'collaborator':
      return count === 1 ? 'collaborateur' : 'collaborateurs';
  }
};

const getContextMessage = (resourceType: ResourceType): string => {
  switch (resourceType) {
    case 'registry':
      return 'Pour créer plus de registres, vous devez passer à un plan supérieur.';
    case 'usecase':
      return 'Pour créer plus de cas d\'usage dans ce registre, vous devez passer à un plan supérieur.';
    case 'collaborator':
      return 'Pour inviter plus de collaborateurs, vous devez passer à un plan supérieur.';
  }
};

export default function PlanLimitModal({
  isOpen,
  onClose,
  currentCount,
  maxLimit,
  planName,
  resourceType,
  customMessage
}: PlanLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const resourceText = getResourceText(resourceType, maxLimit);
  const contextMessage = customMessage || getContextMessage(resourceType);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Limite atteinte</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 mb-4 leading-relaxed">
            Vous avez atteint la limite de{' '}
            <span className="font-semibold text-gray-900">
              {maxLimit} {resourceText}
            </span>{' '}
            {resourceType === 'usecase' && 'par registre '}
            autorisée par votre plan{' '}
            <span className="font-semibold text-gray-900">{planName}</span>.
          </p>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                {contextMessage}
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/settings?section=subscription')}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#0080A3] to-[#006280] text-white hover:from-[#006280] hover:to-[#004d60] rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg"
          >
            Choisir un plan
          </button>
        </div>
      </div>
    </div>
  );
}
