'use client';

import { X, Users, Building2 } from 'lucide-react';

interface InviteScopeChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScope: (scope: 'company' | 'registry') => void;
}

export default function InviteScopeChoiceModal({
  isOpen,
  onClose,
  onSelectScope
}: InviteScopeChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Niveau d'invitation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Choisissez le niveau d'accès pour le collaborateur :
          </p>

          {/* Option Compte */}
          <button
            onClick={() => onSelectScope('company')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#0080A3] hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Users className="w-5 h-5 text-[#0080A3]" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Niveau Compte</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Accès à tous vos registres actuels et futurs
                </p>
              </div>
            </div>
          </button>

          {/* Option Registre */}
          <button
            onClick={() => onSelectScope('registry')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#0080A3] hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                <Building2 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Niveau Registre</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Accès uniquement à ce registre
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
