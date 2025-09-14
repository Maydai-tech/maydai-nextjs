'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useApiCall } from '@/lib/api-auth';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Eye, 
  Edit, 
  Shield, 
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import CollaborationModal from '@/components/CollaborationModal';

interface Collaborator {
  id: string;
  email: string;
  name?: string;
  role: 'read_only' | 'editor' | 'administrator';
  status: 'pending' | 'active' | 'suspended';
  invited_at: string;
  last_activity?: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_invite: boolean;
    can_manage_users: boolean;
  };
}

interface ProjectAccess {
  project_id: string;
  project_name: string;
  access_level: 'read_only' | 'editor' | 'administrator';
  granted_at: string;
  last_access?: string;
}

export default function CollaborationPage() {
  const { user } = useAuth();
  const api = useApiCall();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [projectAccess, setProjectAccess] = useState<ProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Charger les données au montage du composant
  useEffect(() => {
    loadCollaborationData();
  }, []);

  const loadCollaborationData = async () => {
    try {
      setLoading(true);
      
      // Charger les collaborateurs
      const collaboratorsResponse = await api.get('/api/collaboration/collaborators');
      if (collaboratorsResponse.data && !collaboratorsResponse.error) {
        setCollaborators(collaboratorsResponse.data);
      }

      // Charger l'accès aux projets
      const projectsResponse = await api.get('/api/collaboration/projects-access');
      if (projectsResponse.data && !projectsResponse.error) {
        setProjectAccess(projectsResponse.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de collaboration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCollaborator = async (data: { email: string; role: string; message?: string }) => {
    try {
      const response = await api.post('/api/collaboration/collaborators', data);
      if (response.data && !response.error) {
        // Recharger les données
        await loadCollaborationData();
        setShowInviteModal(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      throw error;
    }
  };

  const handleUpdateCollaborator = async (data: { id: string; role: string; permissions: any }) => {
    try {
      // TODO: Implémenter l'API de mise à jour
      console.log('Mise à jour du collaborateur:', data);
      // Recharger les données
      await loadCollaborationData();
      setShowEditModal(false);
      setSelectedCollaborator(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw error;
    }
  };

  const handleEditCollaborator = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setShowEditModal(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'read_only':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'editor':
        return <Edit className="w-4 h-4 text-orange-500" />;
      case 'administrator':
        return <Shield className="w-4 h-4 text-red-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'read_only':
        return 'Lecture seule';
      case 'editor':
        return 'Éditeur';
      case 'administrator':
        return 'Administrateur';
      default:
        return 'Non défini';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Actif
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Suspendu
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Bannière d'information Beta */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-yellow-600 text-lg">🚧</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Fonctionnalité en développement
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              <p>
                La plateforme MaydAI est en Beta Test. Les invitations de collaborateurs ne sont pas encore disponibles. 
                Vous pouvez consulter la page des activités pour voir les interactions existantes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Collaboration</h1>
          <p className="text-gray-600">
            Gérez les invités et leurs accès aux projets de votre entreprise
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link
            href="/collaboration/activities"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            Voir les activités
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled
            className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed opacity-50"
            title="La plateforme MaydAI est en Beta Test, vous ne pouvez pas encore inviter des collaborateurs"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter un collaborateur
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-[#0080A3] mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total collaborateurs</p>
              <p className="text-2xl font-bold text-gray-900">{collaborators.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborators.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborators.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Projets partagés</p>
              <p className="text-2xl font-bold text-gray-900">{projectAccess.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Liste des collaborateurs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-[#0080A3]" />
              Collaborateurs
            </h2>
          </div>
          <div className="p-6">
            {collaborators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun collaborateur invité pour le moment</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-yellow-800 text-sm font-medium mb-2">🚧 Fonctionnalité en cours de développement</p>
                  <p className="text-yellow-700 text-sm">
                    La plateforme MaydAI est en Beta Test, vous ne pouvez pas encore inviter des collaborateurs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#0080A3] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {collaborator.name ? collaborator.name.charAt(0).toUpperCase() : collaborator.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {collaborator.name || collaborator.email}
                        </p>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(collaborator.role)}
                          <span className="text-sm text-gray-600">
                            {getRoleLabel(collaborator.role)}
                          </span>
                          {getStatusBadge(collaborator.status)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditCollaborator(collaborator)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Modifier les permissions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Accès aux projets */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-[#0080A3]" />
              Accès aux projets
            </h2>
          </div>
          <div className="p-6">
            {projectAccess.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun projet partagé pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projectAccess.map((access) => (
                  <div
                    key={access.project_id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{access.project_name}</h3>
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(access.access_level)}
                        <span className="text-sm text-gray-600">
                          {getRoleLabel(access.access_level)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Accès accordé le {new Date(access.granted_at).toLocaleDateString('fr-FR')}
                      {access.last_access && (
                        <span className="ml-2">
                          • Dernière activité : {new Date(access.last_access).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚧</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Fonctionnalité en cours de développement
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  La plateforme MaydAI est en Beta Test, vous ne pouvez pas encore inviter des collaborateurs.
                </p>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Cette fonctionnalité sera bientôt disponible. En attendant, vous pouvez consulter la page des activités pour voir les interactions existantes.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <Link
                  href="/collaboration/activities"
                  className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors"
                  onClick={() => setShowInviteModal(false)}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Voir les activités
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CollaborationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCollaborator(null);
        }}
        collaborator={selectedCollaborator}
        onUpdate={handleUpdateCollaborator}
      />
    </div>
  );
}
