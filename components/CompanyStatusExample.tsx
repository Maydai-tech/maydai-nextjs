import React from 'react';
import CompanyStatusBadge from './CompanyStatusBadge';

/**
 * Exemple d'utilisation du composant CompanyStatusBadge
 * Ce composant montre comment afficher le statut d'entreprise dans différents contextes
 */
export default function CompanyStatusExample() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-900">Exemples d'affichage du statut d'entreprise</h2>
      
      {/* Exemple 1: Badge simple */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Badge simple</h3>
        <div className="flex flex-wrap gap-2">
          <CompanyStatusBadge status="utilisateur" />
          <CompanyStatusBadge status="fabriquant_produits" />
          <CompanyStatusBadge status="distributeur" />
          <CompanyStatusBadge status="importateur" />
          <CompanyStatusBadge status="fournisseur" />
          <CompanyStatusBadge status="mandataire" />
          <CompanyStatusBadge status="unknown" />
        </div>
      </div>
      
      {/* Exemple 2: Badge avec définition */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Badge avec définition</h3>
        <CompanyStatusBadge status="fabriquant_produits" showDefinition={true} />
      </div>
      
      {/* Exemple 3: Dans un contexte de cas d'usage */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Dans un contexte de cas d'usage</h3>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Cas d'usage: Assistant IA pour support client</h4>
            <CompanyStatusBadge status="utilisateur" />
          </div>
          <p className="text-gray-600">
            Ce cas d'usage utilise un système d'IA tiers pour améliorer le support client.
            Le statut d'entreprise est déterminé automatiquement basé sur les réponses au questionnaire.
          </p>
        </div>
      </div>
      
      {/* Exemple 4: Dans un tableau de cas d'usage */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Dans un tableau de cas d'usage</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Nom</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Statut d'entreprise</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">Assistant IA Support</td>
                <td className="px-4 py-2">
                  <CompanyStatusBadge status="utilisateur" />
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">85%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">Robot de Fabrication</td>
                <td className="px-4 py-2">
                  <CompanyStatusBadge status="fabriquant_produits" />
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">92%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">Plateforme IA</td>
                <td className="px-4 py-2">
                  <CompanyStatusBadge status="fournisseur" />
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">78%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

