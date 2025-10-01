'use client';

import { Users, UserX, Building2, Crown, User as UserIcon } from 'lucide-react';

interface Collaborator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  role?: 'owner' | 'user';
  companiesCount?: number;
}

interface CollaboratorListProps {
  collaborators: Collaborator[];
  loading?: boolean;
  showCompanyCount?: boolean;
  onRemove?: (collaboratorId: string) => void;
  emptyMessage?: string;
}

export default function CollaboratorList({
  collaborators,
  loading = false,
  showCompanyCount = false,
  onRemove,
  emptyMessage = 'Aucun collaborateur pour le moment'
}: CollaboratorListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
        <p className="text-gray-500 text-sm mt-4">Chargement des collaborateurs...</p>
      </div>
    );
  }

  if (!collaborators || collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Users className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collaborators.map((collaborator) => (
        <div
          key={collaborator.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center space-x-3 flex-1">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#0080A3] bg-opacity-10 flex items-center justify-center flex-shrink-0">
              {collaborator.role === 'owner' ? (
                <Crown className="w-5 h-5 text-[#0080A3]" />
              ) : (
                <UserIcon className="w-5 h-5 text-[#0080A3]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {collaborator.firstName || 'Prénom'} {collaborator.lastName || 'Nom'}
                </p>
                {collaborator.role === 'owner' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Propriétaire
                  </span>
                )}
                {collaborator.role === 'user' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Collaborateur
                  </span>
                )}
              </div>
              {collaborator.email && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {collaborator.email}
                </p>
              )}
              {showCompanyCount && collaborator.companiesCount !== undefined && (
                <div className="flex items-center space-x-1 mt-1">
                  <Building2 className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {collaborator.companiesCount} registre{collaborator.companiesCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {onRemove && collaborator.role !== 'owner' && (
              <button
                onClick={() => onRemove(collaborator.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Retirer l'accès"
              >
                <UserX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
