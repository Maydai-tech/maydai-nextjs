import React from 'react';

interface CompanyStatusBadgeProps {
  status: 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown';
  showDefinition?: boolean;
}

export default function CompanyStatusBadge({ status, showDefinition = false }: CompanyStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'utilisateur':
        return {
          label: 'Utilisateur',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '🏢'
        };
      case 'fabriquant_produits':
        return {
          label: 'Fabricant de Produits',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: '🏭'
        };
      case 'distributeur':
        return {
          label: 'Distributeur',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '📦'
        };
      case 'importateur':
        return {
          label: 'Importateur',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '🚢'
        };
      case 'fournisseur':
        return {
          label: 'Fournisseur',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🔧'
        };
      case 'mandataire':
        return {
          label: 'Mandataire',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: '🤝'
        };
      case 'unknown':
      default:
        return {
          label: 'Non déterminé',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓'
        };
    }
  };

  const getDefinition = (status: string) => {
    switch (status) {
      case 'utilisateur':
        return 'Toute personne physique ou morale, autorité publique, agence ou autre organisme qui utilise un système d\'IA sous sa propre autorité, sauf si ce système est utilisé dans le cadre d\'une activité personnelle et non professionnelle.';
      case 'fabriquant_produits':
        return 'Il s\'agit d\'un fabricant qui met sur le marché européen un système d\'IA avec son propre produit et sous sa propre marque. Si un système d\'IA à haut risque constitue un composant de sécurité d\'un produit couvert par la législation d\'harmonisation de l\'Union, le fabricant de ce produit est considéré comme le fournisseur du système d\'IA à haut risque.';
      case 'distributeur':
        return 'Une personne physique ou morale faisant partie de la chaîne d\'approvisionnement, autre que le fournisseur ou l\'importateur, qui met un système d\'IA à disposition sur le marché de l\'Union.';
      case 'importateur':
        return 'Une personne physique ou morale située ou établie dans l\'Union qui met sur le marché un système d\'IA portant le nom ou la marque d\'une personne physique ou morale établie dans un pays tiers.';
      case 'fournisseur':
        return 'Une personne physique ou morale, une autorité publique, une agence ou tout autre organisme qui développe (ou fait développer) un système d\'IA ou un modèle d\'IA à usage général et le met sur le marché ou le met en service sous son propre nom ou sa propre marque, que ce soit à titre onéreux ou gratuit.';
      case 'mandataire':
        return 'Une personne physique ou morale située ou établie dans l\'Union qui a reçu et accepté un mandat écrit d\'un fournisseur de système d\'IA ou de modèle d\'IA à usage général pour s\'acquitter en son nom des obligations et des procédures établies par le règlement.';
      case 'unknown':
      default:
        return 'Impossible de déterminer le statut d\'entreprise basé sur les réponses actuelles.';
    }
  };

  const config = getStatusConfig(status);
  const definition = getDefinition(status);

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <span className="mr-2">{config.icon}</span>
        {config.label}
      </div>
      
      {showDefinition && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
          <p className="font-medium text-gray-800 mb-1">Définition IA Act :</p>
          <p>{definition}</p>
        </div>
      )}
    </div>
  );
}

