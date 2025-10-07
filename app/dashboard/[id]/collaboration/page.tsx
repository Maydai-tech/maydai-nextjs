'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useParams } from 'next/navigation';
import { Users, UserPlus, Info, Building2, Globe } from 'lucide-react';
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal';
import RegistryCollaboratorList from '@/components/Collaboration/RegistryCollaboratorList';
import ConfirmRemoveCollaboratorModal from '@/components/Collaboration/ConfirmRemoveCollaboratorModal';

interface Company {
  id: string;
  name: string;
  role?: 'owner' | 'user';
}

interface Collaborator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  role?: 'owner' | 'user';
  scope?: 'account' | 'registry';
}

export default function CollaborationPage() {
  const { user, getAccessToken } = useAuth();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    if (company) {
      fetchCollaborators();
    }
  }, [company]);

  const fetchCompany = async () => {
    if (!user || !companyId) return;

    setLoadingCompany(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      const currentCompany = data.find((c: Company) => c.id === companyId);

      if (!currentCompany) {
        throw new Error('Company not found');
      }

      setCompany(currentCompany);
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoadingCompany(false);
    }
  };

  const fetchCollaborators = async () => {
    if (!user || !companyId) return;

    setLoadingCollaborators(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`/api/companies/${companyId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const data = await response.json();
      setCollaborators(data);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const handleInviteCollaborator = async (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    if (!user || !companyId) return;

    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`/api/companies/${companyId}/collaborators`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to invite collaborator');
    }

    await fetchCollaborators();
    setShowInviteModal(false);
  };

  const handleRemoveCollaboratorClick = (collaboratorId: string) => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    if (collaborator) {
      setSelectedCollaborator(collaborator);
      setShowRemoveModal(true);
    }
  };

  const handleConfirmRemoveCollaborator = async () => {
    if (!user || !selectedCollaborator || !companyId) return;

    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`/api/companies/${companyId}/collaborators/${selectedCollaborator.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to remove collaborator');
    }

    await fetchCollaborators();
    setShowRemoveModal(false);
    setSelectedCollaborator(null);
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
            <p className="text-gray-500 text-sm mt-4 ml-3">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Registre introuvable</h3>
            <p className="text-gray-500">
              Le registre demande n'existe pas ou vous n'y avez pas acces.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = company.role === 'owner';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Gestion des Collaborateurs
          </h1>
          <p className="text-gray-600">Gerez les acces pour le registre : {company.name}</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-xl border border-gray-100">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Collaborateurs du registre
              </h2>
              <p className="text-gray-500">
                {isOwner
                  ? 'Invitez des collaborateurs pour ce registre specifique'
                  : 'Liste des collaborateurs de ce registre'}
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
                Liste des collaborateurs ayant acces a ce registre
              </p>
            </div>

            <RegistryCollaboratorList
              collaborators={collaborators}
              loading={loadingCollaborators}
              onRemove={isOwner ? handleRemoveCollaboratorClick : undefined}
              emptyMessage="Aucun collaborateur pour ce registre. Invitez votre premiere personne !"
            />
          </div>

          {isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                A propos des niveaux d'acces
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 mr-2 mt-0.5">
                    <Globe className="w-3 h-3 mr-1" />
                    Compte
                  </span>
                  <span>Invites depuis Parametres, ont acces a TOUS vos registres</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 mr-2 mt-0.5">
                    <Building2 className="w-3 h-3 mr-1" />
                    Registre
                  </span>
                  <span>Invites specifiquement pour CE registre uniquement</span>
                </li>
                <li>• Les collaborateurs "Compte" ne peuvent etre supprimes que depuis la page Parametres</li>
                <li>• Les collaborateurs "Registre" peuvent etre supprimes directement ici</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteCollaborator}
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
    </div>
  );
}
