'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckSquare,
  Square,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Upload,
  TrendingUp,
  Check
} from 'lucide-react'
import RegistryProofUpload from '@/components/RegistryProofUpload'
import RegistreMaydaiBadge from '@/app/dashboard/[id]/components/RegistreMaydaiBadge'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  useCaseId: string
  docType: 'registry_action'
  registryCase?: 'A' | 'B' | 'C'
  actionNumber?: number // Optional numbering for ordered actions
  potentialPoints?: number // Points that can be gained by completing this action
  earnedPoints?: number // Points that were earned by completing this action
}

interface RegistryToDoActionProps {
  todo: TodoItem
  isExpanded: boolean
  onToggle: (todoId: string) => void
  companyId: string
  onDocumentUploaded?: () => void
  maydaiAsRegistry?: boolean
  hasRegistryProofDocument?: boolean
}

export default function RegistryToDoAction({
  todo,
  isExpanded,
  onToggle,
  companyId,
  onDocumentUploaded,
  maydaiAsRegistry = false,
  hasRegistryProofDocument = false
}: RegistryToDoActionProps) {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Navigate to registry settings
  const handleGoToSettings = () => {
    router.push(`/dashboard/${companyId}/settings#registry`)
  }

  // Navigate to dossier detail page with registry_proof section expanded
  const handleViewDocument = () => {
    router.push(`/dashboard/${companyId}/dossiers/${todo.useCaseId}?doc=registry_proof`)
  }

  // Handle proof upload
  const handleUploadProof = () => {
    setShowUploadModal(true)
  }

  // Handle upload complete
  const handleUploadComplete = () => {
    setShowUploadModal(false)
    onDocumentUploaded?.()
  }

  // Get explanation text based on case
  const getExplanation = () => {
    switch (todo.registryCase) {
      case 'A':
        // If a document has been uploaded, show confirmation
        if (hasRegistryProofDocument) {
          return "Vous avez déclaré un autre registre que MaydAI pour vos systèmes IA Act."
        }
        // Otherwise, show action needed
        return "Vous avez indiqué ne pas maintenir de registre centralisé pour vos systèmes IA. Conformément à l'AI Act, vous devez soit déclarer MaydAI comme votre registre centralisé, soit prouver l'utilisation d'un autre registre."
      case 'B':
        // If MaydAI is declared, show confirmation
        if (maydaiAsRegistry) {
          return "Vous avez déclaré MaydAI comme votre registre centralisé IA Act."
        }
        // Otherwise, show action needed
        return "Vous avez indiqué utiliser MaydAI comme registre centralisé. Confirmez ce choix dans les paramètres de votre entreprise pour valider cette action."
      case 'C':
        // If a document has been uploaded, show confirmation
        if (hasRegistryProofDocument) {
          return "Vous avez déclaré un autre registre que MaydAI pour vos systèmes IA Act."
        }
        // Otherwise, show action needed
        return "Vous avez indiqué utiliser un autre registre centralisé. Veuillez fournir une preuve de l'utilisation de ce registre (capture d'écran, document, etc.) ou déclarer MaydAI comme votre registre à la place."
      default:
        return "Action requise pour le registre centralisé de vos systèmes IA."
    }
  }

  // Render action buttons based on case
  const renderActionButtons = () => {
    switch (todo.registryCase) {
      case 'A':
        // If registry proof document exists, show "View document" button
        if (hasRegistryProofDocument) {
          return (
            <button
              onClick={handleViewDocument}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              Voir le document
              <ChevronRight className="w-5 h-5" />
            </button>
          )
        }
        // Otherwise, show both options
        return (
          <div className="flex flex-row gap-2 flex-wrap">
            <button
              onClick={handleGoToSettings}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              Déclarer MaydAI comme registre centralisé
            </button>
            <button
              onClick={handleUploadProof}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#0080A3] border-2 border-[#0080A3] font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Prouver l'usage d'un autre registre
            </button>
          </div>
        )
      case 'B':
        // If MaydAI is already declared as registry, show "View settings" button
        if (maydaiAsRegistry) {
          return (
            <button
              onClick={handleGoToSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              <Settings className="w-5 h-5" />
              Voir les paramètres du registre
              <ChevronRight className="w-5 h-5" />
            </button>
          )
        }
        // Otherwise, show "Confirm MaydAI" button
        return (
          <button
            onClick={handleGoToSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            <Settings className="w-5 h-5" />
            Confirmer MaydAI comme registre centralisé
            <ChevronRight className="w-5 h-5" />
          </button>
        )
      case 'C':
        // If registry proof document exists, show "View document" button
        if (hasRegistryProofDocument) {
          return (
            <button
              onClick={handleViewDocument}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              Voir le document
              <ChevronRight className="w-5 h-5" />
            </button>
          )
        }
        // Otherwise, show both options
        return (
          <div className="flex flex-row gap-2 flex-wrap">
            <button
              onClick={handleUploadProof}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
            >
              <Upload className="w-5 h-5" />
              Prouver l'usage de mon registre
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoToSettings}
              className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#0080A3] border-2 border-[#0080A3] font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Déclarer MaydAI comme registre à la place
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      {/* Todo header - clickable to expand */}
      <div
        onClick={() => onToggle(todo.id)}
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle(todo.id)
          }
        }}
      >
        {/* Checkbox icon */}
        {todo.completed ? (
          <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <Square className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3]" />
        )}

        {/* Todo text */}
        <span className={`flex-1 text-sm ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {todo.actionNumber ? `${todo.actionNumber}. ${todo.text}` : todo.text}
        </span>

        {/* Points badges - different styles for earned vs potential */}
        {todo.earnedPoints && todo.earnedPoints > 0 ? (
          // Pastille "Gagné" - Vert foncé avec icône Check (action complétée avec gain de points)
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full flex-shrink-0">
            <Check className="w-3 h-3" />
            +{todo.earnedPoints} pts
          </span>
        ) : todo.potentialPoints && todo.potentialPoints > 0 ? (
          // Pastille "Potentiel" - Vert clair avec icône TrendingUp (points à gagner)
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex-shrink-0">
            <TrendingUp className="w-3 h-3" />
            +{todo.potentialPoints} pts
          </span>
        ) : null}

        {/* Badge Registre MaydAI (uniquement sur la ligne registre quand MaydAI est le registre) */}
        {maydaiAsRegistry && (
          <RegistreMaydaiBadge compact className="flex-shrink-0" />
        )}

        {/* Chevron icon */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-[#0080A3] transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '600px' : '0',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="pl-8 pr-3 pb-3 space-y-4">
          {/* Explanation text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              {getExplanation()}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {todo.completed ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-600">
                  Action complétée
                </span>
                {maydaiAsRegistry && <RegistreMaydaiBadge compact />}
              </>
            ) : null }
          </div>

          {/* CTA Buttons */}
          {renderActionButtons()}
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && todo.registryCase && (todo.registryCase === 'A' || todo.registryCase === 'C') && (
        <RegistryProofUpload
          usecaseId={todo.useCaseId}
          registryCase={todo.registryCase}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  )
}
