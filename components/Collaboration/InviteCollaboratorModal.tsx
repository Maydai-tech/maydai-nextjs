'use client';

import { useState } from 'react';
import { UserPlus, X, Mail, User, AlertCircle, CheckCircle, Users, Building2 } from 'lucide-react';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  scope: 'company' | 'registry' | 'usecase';
}

interface InvitedUser {
  firstName: string;
  lastName: string;
  email: string;
}

export default function InviteCollaboratorModal({
  isOpen,
  onClose,
  onInvite,
  scope
}: InviteCollaboratorModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitedUser, setInvitedUser] = useState<InvitedUser | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!onInvite) {
        throw new Error('Fonction onInvite non définie');
      }

      await onInvite({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      // Sauvegarder les infos de l'utilisateur invité pour l'écran de confirmation
      setInvitedUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      console.error('Erreur lors de l\'invitation:', err);

      // Traduire les erreurs courantes
      if (errorMessage.includes('email_address_invalid')) {
        setError('Configuration email Supabase requise. Vérifiez Authentication > Providers > Email dans votre dashboard Supabase.');
      } else if (errorMessage.includes('Failed to invite user')) {
        setError('Impossible d\'envoyer l\'invitation. Vérifiez la configuration SMTP de Supabase.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state when closing
    setFormData({ email: '', firstName: '', lastName: '' });
    setError('');
    setInvitedUser(null);
    onClose();
  };

  const getScopeLabel = () => {
    switch (scope) {
      case 'company':
        return 'au niveau du compte';
      case 'registry':
        return 'au niveau du registre';
      case 'usecase':
        return 'au niveau du cas d\'usage';
      default:
        return '';
    }
  };

  const getScopeDescription = () => {
    switch (scope) {
      case 'company':
        return 'Il aura accès à tous vos registres actuels et futurs.';
      case 'registry':
        return 'Il aura accès uniquement à ce registre et ses cas d\'usage.';
      case 'usecase':
        return 'Il aura accès uniquement à ce cas d\'usage.';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  // Écran de confirmation après invitation réussie
  if (invitedUser) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-lg w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                Invitation envoyée
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Success message */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {invitedUser.firstName} {invitedUser.lastName} a bien été invité(e)
              </h3>
              <p className="text-sm text-gray-600">
                à collaborer {getScopeLabel()}
              </p>
            </div>

            {/* User info card */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-[#0080A3] rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {invitedUser.firstName.charAt(0)}{invitedUser.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {invitedUser.firstName} {invitedUser.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{invitedUser.email}</p>
                </div>
              </div>
            </div>

            {/* Scope info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                {scope === 'company' ? (
                  <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Accès {scope === 'company' ? 'Compte' : scope === 'registry' ? 'Registre' : 'Cas d\'usage'}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {getScopeDescription()}
                  </p>
                </div>
              </div>
            </div>

            {/* Email notification info */}
            <div className="flex items-start space-x-2 text-sm text-gray-500">
              <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Un email d'invitation a été envoyé à {invitedUser.email}.
                Le collaborateur pourra accéder à la plateforme dès qu'il aura accepté l'invitation.
              </p>
            </div>

            {/* Close button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserPlus className="w-5 h-5 text-[#0080A3] mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Inviter un collaborateur
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              Prénom
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                placeholder="Jean"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-transparent"
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Email */}
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
                placeholder="jean.dupont@entreprise.com"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-700 mt-1">
                  Le collaborateur aura accès {scope === 'company' ? 'à tous vos registres' : scope === 'registry' ? 'à ce registre uniquement' : 'à ce cas d\'usage uniquement'}.
                </p>
              </div>
            </div>
          </div>

          {/* Permissions info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Permissions des collaborateurs
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ Peuvent consulter et modifier {scope === 'company' ? 'les registres partagés' : scope === 'registry' ? 'ce registre uniquement' : 'ce cas d\'usage uniquement'}</li>
              <li>✓ Peuvent gérer les cas d'usage des registres</li>
              <li>✓ Peuvent créer de nouveaux {scope === 'company' ? 'registres' : scope === 'registry' ? 'cas d\'usage' : 'cas d\'usage'}</li>
              <li>✗ Ne peuvent pas inviter d'autres collaborateurs</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Envoi...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Envoyer l'invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
