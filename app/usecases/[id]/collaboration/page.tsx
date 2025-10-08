'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useParams } from 'next/navigation';
import { Users, UserPlus, Info, Building2, Globe, FileText } from 'lucide-react';
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal';
import UseCaseCollaboratorList from '@/components/Collaboration/UseCaseCollaboratorList';
import ConfirmRemoveCollaboratorModal from '@/components/Collaboration/ConfirmRemoveCollaboratorModal';
import { UseCaseLayout } from '../components/shared/UseCaseLayout';
import { UseCaseLoader } from '../components/shared/UseCaseLoader';
import { useUseCaseCollaborators } from '../hooks/useUseCaseCollaborators';

interface UseCase {
  id: string;
  name: string;
  company_id: string;
}

interface Collaborator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  role?: 'owner' | 'user';
  scope?: 'account' | 'registry' | 'usecase';
}

export default function CollaborationPage() {
  const { user, getAccessToken } = useAuth();
  const params = useParams();
  const useCaseId = params.id as string;

  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [loadingUseCase, setLoadingUseCase] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  const {
    collaborators,
    loading: loadingCollaborators,
    error,
    inviteCollaborator,
    removeCollaborator,
  } = useUseCaseCollaborators(useCaseId);

  useEffect(() => {
    fetchUseCase();
  }, [useCaseId]);

  const fetchUseCase = async () => {
    if (!user || !useCaseId) return;

    setLoadingUseCase(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`/api/usecases/${useCaseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch use case');
      }

      const data = await response.json();
      setUseCase(data);

      // Check if user is owner
      const companyResponse = await fetch(`/api/companies/${data.company_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        setIsOwner(companyData.role === 'owner');
      }
    } catch (error) {
      console.error('Error fetching use case:', error);
    } finally {
      setLoadingUseCase(false);
    }
  };

  const handleInviteCollaborator = async (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    const result = await inviteCollaborator(data);

    if (result.success) {
      setShowInviteModal(false);
    } else {
      throw new Error(result.error || 'Failed to invite collaborator');
    }
  };

  const handleRemoveCollaboratorClick = (collaboratorId: string) => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    if (collaborator) {
      setSelectedCollaborator(collaborator);
      setShowRemoveModal(true);
    }
  };

  const handleConfirmRemoveCollaborator = async () => {
    if (!selectedCollaborator) return;

    const result = await removeCollaborator(selectedCollaborator.id);

    if (result.success) {
      setShowRemoveModal(false);
      setSelectedCollaborator(null);
    } else {
      throw new Error(result.error || 'Failed to remove collaborator');
    }
  };

  if (loadingUseCase) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />;
  }

  if (!useCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cas d'usage introuvable</h3>
            <p className="text-gray-500">
              Le cas d'usage demandé n'existe pas ou vous n'y avez pas accès.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UseCaseLayout useCase={useCase}>
      <div className="space-y-8">
        <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-xl border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Collaborateurs du cas d'usage
            </h2>
            <p className="text-gray-500">
              {isOwner
                ? 'Invitez des collaborateurs pour ce cas d\'usage spécifique'
                : 'Liste des collaborateurs de ce cas d\'usage'}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter un collaborateur
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#0080A3]" />
              Collaborateurs
            </h3>
            <p className="text-gray-500 text-sm">
              Liste des collaborateurs ayant accès à ce cas d'usage
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <UseCaseCollaboratorList
            collaborators={collaborators}
            loading={loadingCollaborators}
            onRemove={isOwner ? handleRemoveCollaboratorClick : undefined}
            emptyMessage="Aucun collaborateur pour ce cas d'usage. Invitez votre première personne !"
          />
        </div>

        {isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              À propos des niveaux d'accès
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mr-2 mt-0.5">
                  <Globe className="w-3 h-3 mr-1" />
                  Compte
                </span>
                <span>Invités depuis Paramètres, ont accès à TOUS vos registres et cas d'usage</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mr-2 mt-0.5">
                  <Building2 className="w-3 h-3 mr-1" />
                  Registre
                </span>
                <span>Invités au niveau registre, ont accès à tous les cas d'usage du registre</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mr-2 mt-0.5">
                  <FileText className="w-3 h-3 mr-1" />
                  Use Case
                </span>
                <span>Invités spécifiquement pour CE cas d'usage uniquement</span>
              </li>
              <li>• Les collaborateurs "Compte" ne peuvent être supprimés que depuis la page Paramètres</li>
              <li>• Les collaborateurs "Registre" ne peuvent être supprimés que depuis la page du Registre</li>
              <li>• Les collaborateurs "Use Case" peuvent être supprimés directement ici</li>
            </ul>
          </div>
        )}
      </div>

      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteCollaborator}
        scope="usecase"
      />

      <ConfirmRemoveCollaboratorModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setSelectedCollaborator(null);
        }}
        onConfirm={handleConfirmRemoveCollaborator}
        collaborator={selectedCollaborator}
      />
    </UseCaseLayout>
  );
}
