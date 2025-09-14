'use client';

import { useState } from 'react';
import { 
  Mail, 
  User, 
  Shield, 
  Eye, 
  Edit, 
  Calendar,
  Building,
  X,
  Send,
  Copy
} from 'lucide-react';

interface InviteEmailPreviewProps {
  email: string;
  role: 'read_only' | 'editor' | 'administrator';
  message?: string;
  companyName?: string;
  inviterName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSend?: () => void;
}

export default function InviteEmailPreview({
  email,
  role,
  message,
  companyName = "Votre Entreprise",
  inviterName = "Équipe MaydAI",
  isOpen,
  onClose,
  onSend
}: InviteEmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'read_only':
        return 'Vous pourrez consulter les projets et rapports, mais vous ne pourrez pas les modifier.';
      case 'editor':
        return 'Vous pourrez consulter et modifier les projets, mais vous ne pourrez pas gérer les autres utilisateurs.';
      case 'administrator':
        return 'Vous aurez un accès complet : consultation, modification, suppression et gestion des utilisateurs.';
      default:
        return '';
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

  const emailContent = `
Objet : Invitation à collaborer sur MaydAI - ${companyName}

Bonjour,

${inviterName} vous invite à rejoindre l'équipe de collaboration sur MaydAI pour ${companyName}.

${message ? `\nMessage personnalisé :\n"${message}"\n` : ''}

Votre rôle : ${getRoleLabel(role)}
${getRoleDescription(role)}

Pour accepter cette invitation et commencer à collaborer :
1. Cliquez sur le lien ci-dessous
2. Créez votre compte ou connectez-vous
3. Accédez aux projets partagés

[Lien d'invitation : https://app.maydai.com/invite/accept?token=INVITE_TOKEN]

Si vous ne souhaitez pas rejoindre cette équipe, vous pouvez ignorer cet email.

Cordialement,
L'équipe MaydAI

---
MaydAI - Plateforme de conformité RGPD et cybersécurité
`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Mail className="w-5 h-5 text-[#0080A3] mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Aperçu de l'email d'invitation
            </h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations de l'invitation */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Destinataire</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-900">{email}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Rôle attribué</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {getRoleIcon(role)}
                    <span className="text-sm font-medium text-gray-900">
                      {getRoleLabel(role)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {getRoleDescription(role)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Entreprise</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-900">{companyName}</span>
                  </div>
                </div>
              </div>

              {message && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Message personnalisé</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-900 italic">"{message}"</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={copyToClipboard}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copié !' : 'Copier le contenu'}
                </button>
                
                {onSend && (
                  <button
                    onClick={onSend}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </button>
                )}
              </div>
            </div>

            {/* Aperçu de l'email */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Aperçu de l'email</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>De : {inviterName} &lt;noreply@maydai.com&gt;</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span>À : {email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <span>Objet : Invitation à collaborer sur MaydAI - {companyName}</span>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {emailContent.trim()}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Cet email sera envoyé automatiquement lors de l'envoi de l'invitation.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
