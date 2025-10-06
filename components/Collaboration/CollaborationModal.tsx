'use client';

import { useState } from 'react';
import { 
  UserPlus, 
  X, 
  Mail, 
  Shield, 
  Eye, 
  Edit, 
  Save,
  AlertCircle,
  CheckCircle
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

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborator?: Collaborator | null;
  onInvite?: (data: { email: string; role: string; message?: string }) => Promise<void>;
  onUpdate?: (data: { id: string; role: string; permissions: any }) => Promise<void>;
}

export default function CollaborationModal({ 
  isOpen, 
  onClose, 
  collaborator,
  onInvite,
  onUpdate 
}: CollaborationModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'read_only' as 'read_only' | 'editor' | 'administrator',
    message: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEditMode = !!collaborator;

  // Initialiser les données du formulaire si on est en mode édition
  useState(() => {
    if (collaborator && isEditMode) {
      setFormData({
        email: collaborator.email,
        role: collaborator.role,
        message: ''
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isEditMode && onUpdate) {
        await onUpdate({
          id: collaborator.id,
          role: formData.role,
          permissions: getPermissionsForRole(formData.role)
        });
        setSuccess('Collaborateur mis à jour avec succès');
      } else if (!isEditMode && onInvite) {
        await onInvite({
          email: formData.email,
          role: formData.role,
          message: formData.message
        });
        setSuccess('Invitation envoyée avec succès');
        // Reset form
        setFormData({
          email: '',
          role: 'read_only',
          message: ''
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsForRole = (role: string) => {
    switch (role) {
      case 'read_only':
        return {
          can_view: true,
          can_edit: false,
          can_delete: false,
          can_invite: false,
          can_manage_users: false
        };
      case 'editor':
        return {
          can_view: true,
          can_edit: true,
          can_delete: false,
          can_invite: false,
          can_manage_users: false
        };
      case 'administrator':
        return {
          can_view: true,
          can_edit: true,
          can_delete: true,
          can_invite: true,
          can_manage_users: true
        };
      default:
        return {
          can_view: true,
          can_edit: false,
          can_delete: false,
          can_invite: false,
          can_manage_users: false
        };
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'read_only':
        return 'Peut consulter les projets et rapports, mais ne peut pas les modifier';
      case 'editor':
        return 'Peut consulter et modifier les projets, mais ne peut pas gérer les utilisateurs';
      case 'administrator':
        return 'Accès complet : peut consulter, modifier, supprimer et gérer les utilisateurs';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {isEditMode ? (
              <>
                <Shield className="w-5 h-5 text-[#0080A3] mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Modifier les permissions
                </h2>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 text-[#0080A3] mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Inviter un collaborateur
                </h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Messages de statut */}
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}

          {/* Email (seulement pour les nouvelles invitations) */}
          {!isEditMode && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                  placeholder="collaborateur@entreprise.com"
                />
              </div>
            </div>
          )}

          {/* Rôle */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Niveau d'accès
            </label>
            <div className="space-y-3">
              {[
                { value: 'read_only', label: 'Lecture seule', icon: Eye },
                { value: 'editor', label: 'Éditeur', icon: Edit },
                { value: 'administrator', label: 'Administrateur', icon: Shield }
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={formData.role === value}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="mt-1 text-[#0080A3] focus:ring-[#0080A3]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getRoleDescription(value)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message personnalisé (seulement pour les nouvelles invitations) */}
          {!isEditMode && (
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message personnalisé (optionnel)
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                placeholder="Bonjour, je vous invite à collaborer sur nos projets de conformité..."
              />
            </div>
          )}

          {/* Informations du collaborateur en mode édition */}
          {isEditMode && collaborator && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Informations</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Email :</strong> {collaborator.email}</p>
                <p><strong>Statut :</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    collaborator.status === 'active' ? 'bg-green-100 text-green-800' :
                    collaborator.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {collaborator.status === 'active' ? 'Actif' :
                     collaborator.status === 'pending' ? 'En attente' : 'Suspendu'}
                  </span>
                </p>
                <p><strong>Invité le :</strong> {new Date(collaborator.invited_at).toLocaleDateString('fr-FR')}</p>
                {collaborator.last_activity && (
                  <p><strong>Dernière activité :</strong> {new Date(collaborator.last_activity).toLocaleDateString('fr-FR')}</p>
                )}
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditMode ? 'Mise à jour...' : 'Envoi...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Mettre à jour
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Envoyer l'invitation
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
