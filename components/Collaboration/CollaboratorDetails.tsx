'use client';

import { useState } from 'react';
import { 
  User, 
  Calendar, 
  Activity, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus, 
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

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

interface ProjectActivity {
  id: string;
  project_name: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface CollaboratorDetailsProps {
  collaborator: Collaborator;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole?: (role: string) => void;
  onSuspend?: () => void;
  onRemove?: () => void;
}

export default function CollaboratorDetails({
  collaborator,
  isOpen,
  onClose,
  onUpdateRole,
  onSuspend,
  onRemove
}: CollaboratorDetailsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'remove' | null>(null);

  // Données mockées pour les activités
  const mockActivities: ProjectActivity[] = [
    {
      id: '1',
      project_name: 'Audit RGPD - Q1 2024',
      action: 'Consultation du rapport',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      details: 'Consultation du rapport final d\'audit RGPD'
    },
    {
      id: '2',
      project_name: 'Conformité ISO 27001',
      action: 'Modification du questionnaire',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      details: 'Mise à jour des questions sur la sécurité des données'
    },
    {
      id: '3',
      project_name: 'Analyse des Risques Cybersécurité',
      action: 'Ajout d\'un nouveau risque',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Identification d\'un nouveau risque de phishing'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'suspended':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending':
        return 'En attente';
      case 'suspended':
        return 'Suspendu';
      default:
        return 'Inconnu';
    }
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
        return <User className="w-4 h-4 text-gray-500" />;
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

  const handleAction = (type: 'suspend' | 'remove') => {
    setActionType(type);
    setShowConfirmDialog(true);
  };

  const confirmAction = () => {
    if (actionType === 'suspend' && onSuspend) {
      onSuspend();
    } else if (actionType === 'remove' && onRemove) {
      onRemove();
    }
    setShowConfirmDialog(false);
    setActionType(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal principal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#0080A3] rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {collaborator.name ? collaborator.name.charAt(0).toUpperCase() : collaborator.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {collaborator.name || collaborator.email}
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  {getRoleIcon(collaborator.role)}
                  <span className="text-sm text-gray-600">
                    {getRoleLabel(collaborator.role)}
                  </span>
                  {getStatusIcon(collaborator.status)}
                  <span className="text-sm text-gray-600">
                    {getStatusLabel(collaborator.status)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenu */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Informations générales */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-[#0080A3]" />
                    Informations générales
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email :</span>
                      <p className="text-gray-900">{collaborator.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Rôle :</span>
                      <p className="text-gray-900 flex items-center space-x-2">
                        {getRoleIcon(collaborator.role)}
                        <span>{getRoleLabel(collaborator.role)}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Statut :</span>
                      <p className="text-gray-900 flex items-center space-x-2">
                        {getStatusIcon(collaborator.status)}
                        <span>{getStatusLabel(collaborator.status)}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Invité le :</span>
                      <p className="text-gray-900">
                        {new Date(collaborator.invited_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {collaborator.last_activity && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Dernière activité :</span>
                        <p className="text-gray-900">
                          {new Date(collaborator.last_activity).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-[#0080A3]" />
                    Permissions
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    {[
                      { key: 'can_view', label: 'Consulter les projets', icon: Eye },
                      { key: 'can_edit', label: 'Modifier les projets', icon: Edit },
                      { key: 'can_delete', label: 'Supprimer des éléments', icon: Trash2 },
                      { key: 'can_invite', label: 'Inviter des collaborateurs', icon: UserPlus },
                      { key: 'can_manage_users', label: 'Gérer les utilisateurs', icon: Settings }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${collaborator.permissions[key as keyof typeof collaborator.permissions] ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className="text-sm text-gray-700">{label}</span>
                        </div>
                        {collaborator.permissions[key as keyof typeof collaborator.permissions] ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activités récentes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-[#0080A3]" />
                  Activités récentes
                </h3>
                <div className="space-y-4">
                  {mockActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune activité récente</p>
                    </div>
                  ) : (
                    mockActivities.map((activity) => (
                      <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{activity.project_name}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{activity.action}</p>
                        {activity.details && (
                          <p className="text-xs text-gray-500">{activity.details}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onUpdateRole && onUpdateRole('read_only')}
                  className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Lecture seule
                </button>
                <button
                  onClick={() => onUpdateRole && onUpdateRole('editor')}
                  className="inline-flex items-center px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Éditeur
                </button>
                <button
                  onClick={() => onUpdateRole && onUpdateRole('administrator')}
                  className="inline-flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Administrateur
                </button>
                {collaborator.status !== 'suspended' && (
                  <button
                    onClick={() => handleAction('suspend')}
                    className="inline-flex items-center px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Suspendre
                  </button>
                )}
                <button
                  onClick={() => handleAction('remove')}
                  className="inline-flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmer l'action
            </h3>
            <p className="text-gray-600 mb-6">
              {actionType === 'suspend' 
                ? 'Êtes-vous sûr de vouloir suspendre ce collaborateur ? Il perdra temporairement l\'accès à tous les projets.'
                : 'Êtes-vous sûr de vouloir supprimer ce collaborateur ? Cette action est irréversible.'
              }
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  actionType === 'suspend' 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'suspend' ? 'Suspendre' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
