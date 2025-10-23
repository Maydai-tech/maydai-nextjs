'use client'

import { Users, Settings } from 'lucide-react'
import CollaboratorList from '@/components/Collaboration/CollaboratorList'

interface CollaborationSectionProps {
  collaborators: any[]
  loadingCollaborators: boolean
  onInvite: () => void
  onRemove: (collaboratorId: string) => void
}

export default function CollaborationSection({
  collaborators,
  loadingCollaborators,
  onInvite,
  onRemove
}: CollaborationSectionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-xl border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Collaboration</h2>
          <p className="text-gray-500">Gérez les accès de vos collaborateurs à vos registres</p>
        </div>
        <button
          onClick={onInvite}
          className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white rounded-lg hover:bg-[#006280] transition-colors"
        >
          <Users className="w-4 h-4 mr-2" />
          Inviter un collaborateur
        </button>
      </div>

      {/* Collaborators list */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Collaborateurs</h3>
          <p className="text-gray-500 text-sm">Liste de tous vos collaborateurs et le nombre de registres auxquels ils ont accès</p>
        </div>

        <CollaboratorList
          collaborators={collaborators}
          loading={loadingCollaborators}
          showCompanyCount={true}
          emptyMessage="Aucun collaborateur pour le moment. Invitez votre première personne !"
          onRemove={onRemove}
        />
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          À propos des collaborateurs
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Les collaborateurs peuvent consulter et modifier les registres partagés</li>
          <li>• Ils peuvent créer de nouveaux registres</li>
          <li>• Ils ne peuvent pas inviter d'autres collaborateurs</li>
        </ul>
      </div>
    </div>
  )
}
