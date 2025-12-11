import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UseCase, Progress } from '../../types/usecase'
import { ComplAIModel } from '@/lib/supabase'
import { getStatusColor, getUseCaseStatusInFrench } from '../../utils/questionnaire'
import { useCaseRoutes } from '../../utils/routes'
import { useUseCaseNavigation } from '../../utils/navigation'
import { ArrowLeft, Building, CheckCircle, Clock, Edit3, RefreshCcw, AlertTriangle, Trash2, Download, UserPlus } from 'lucide-react'
import Image from 'next/image'
import ModelSelectorModal from '../ModelSelectorModal'
import DeleteConfirmationModal from '../DeleteConfirmationModal'
import { RiskLevelBadge } from './RiskLevelBadge'
import { useRiskLevel } from '../../hooks/useRiskLevel'
import { CountryDeploymentDisplay } from './CountryDeploymentDisplay'
import { useAuth } from '@/lib/auth'
import WorldMap from '@/components/WorldMap'
import { getProviderIcon } from '@/lib/provider-icons'
import { getScoreStyle } from '@/lib/score-styles'
import { usePDFExport } from '../../hooks/usePDFExport'
import { useUseCaseScore } from '../../hooks/useUseCaseScore'
import { useCompanyInfo } from '../../hooks/useCompanyInfo'
import InviteScopeChoiceModal from '@/components/Collaboration/InviteScopeChoiceModal'
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal'

type PartialComplAIModel = Pick<ComplAIModel, 'id' | 'model_name' | 'model_provider'> & Partial<Pick<ComplAIModel, 'model_type' | 'version' | 'created_at' | 'updated_at'>>

interface UseCaseHeaderProps {
  useCase: UseCase
  progress?: Progress | null
  onUpdateUseCase?: (updates: Partial<UseCase>) => Promise<UseCase | null>
  updating?: boolean
}

const getStatusIcon = (status: string) => {
  const frenchStatus = getUseCaseStatusInFrench(status)
  switch (frenchStatus.toLowerCase()) {
    case 'complété': return <CheckCircle className="h-4 w-4" />
    case 'en cours': return <Clock className="h-4 w-4" />
    case 'à compléter': return <Clock className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}


// Composant d'affichage du score dans le header
// Utilise le hook useUseCaseScore pour garantir la synchronisation avec l'API (source de vérité unique)
function HeaderScore({ useCaseId }: { useCaseId: string }) {
  // Récupération du score via l'API (même source que le rapport)
  const { score, loading, error } = useUseCaseScore(useCaseId)

  // État de chargement
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          Score de conformité
        </h3>
        <div className="relative">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">--</div>
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
            <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
            Chargement...
          </div>
        </div>
      </div>
    )
  }

  // État d'erreur ou score non disponible
  if (error || !score) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          Score de conformité
        </h3>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
          <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
          <div className="text-xs text-gray-500">Non disponible</div>
        </div>
      </div>
    )
  }

  // Le score est déjà en pourcentage (0-100) depuis la base de données
  const displayScore = Math.round(score.score)

  // Utilise les styles unifiés de l'application
  const scoreStyle = getScoreStyle(displayScore)

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <div className={`w-2 h-2 rounded-full mr-2 ${scoreStyle.indicator}`}></div>
        Score de conformité
      </h3>

      <div className={`${scoreStyle.bg} rounded-xl p-4 border ${scoreStyle.border} ${scoreStyle.shadow} shadow-sm hover:shadow-md transition-all duration-200`}>
        <div className="text-center relative">
          <div className={`text-3xl font-bold ${scoreStyle.text} mb-2`}>
            {displayScore}
          </div>

          {score.is_eliminated && (
            <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Éliminé
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function UseCaseHeader({ useCase, progress, onUpdateUseCase, updating = false }: UseCaseHeaderProps) {
  const frenchStatus = getUseCaseStatusInFrench(useCase.status)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false) // État local pour l'animation du score pendant le recalcul
  const [isScopeChoiceModalOpen, setIsScopeChoiceModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteScope, setInviteScope] = useState<'company' | 'registry'>('registry')
  const { goToEvaluation } = useUseCaseNavigation(useCase.id, useCase.company_id)
  const { riskLevel, loading: riskLoading, error: riskError } = useRiskLevel(useCase.id)
  const { isGenerating, error: pdfError, generatePDF } = usePDFExport(useCase.id)
  const { isOwner } = useCompanyInfo(useCase.company_id)
  const router = useRouter()
  const { session } = useAuth()

  // Fonction pour déterminer le statut de déploiement (Actif/Inactif)
  const getDeploymentStatus = (deploymentDate?: string): 'Actif' | 'Inactif' => {
    if (!deploymentDate) return 'Inactif'

    try {
      const deployment = new Date(deploymentDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      deployment.setHours(0, 0, 0, 0)

      // Vérifier si la date est valide
      if (isNaN(deployment.getTime())) return 'Inactif'

      return deployment <= today ? 'Actif' : 'Inactif'
    } catch (error) {
      return 'Inactif'
    }
  }

  // Fonction pour obtenir les styles de la pastille de statut de déploiement
  const getDeploymentStatusColor = (status: 'Actif' | 'Inactif') => {
    if (status === 'Actif') {
      return {
        backgroundColor: '#f1fdfa',
        color: '#0080a3',
        border: 'border border-[#0080a3]'
      }
    } else {
      return {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        border: 'border border-gray-300'
      }
    }
  }

  const handleModelEdit = () => {
    setIsModalOpen(true)
  }

  // Gestionnaire de sauvegarde du modèle IA sélectionné
  const handleModelSave = async (selectedModel: PartialComplAIModel | null) => {
    if (!onUpdateUseCase) return

    try {
      // Active l'animation de recalcul du score
      setIsRecalculatingScore(true)

      // Mise à jour du modèle (déclenche automatiquement le recalcul du score côté serveur)
      await onUpdateUseCase({
        primary_model_id: selectedModel?.id || undefined
      })

      // Animation visuelle pendant 1 seconde pour feedback utilisateur
      setTimeout(() => {
        setIsRecalculatingScore(false)
      }, 1000)
    } catch (error) {
      setIsRecalculatingScore(false)
      throw error
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/usecases/${useCase.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      // Redirection vers le dashboard avec un message de succès
      router.push(`/dashboard/${useCase.company_id}?deleted=true&useCaseName=${encodeURIComponent(useCase.name)}`)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Une erreur est survenue lors de la suppression du use case')
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false)
  }

  const handleInviteClick = () => {
    setIsScopeChoiceModalOpen(true)
  }

  const handleScopeSelect = (scope: 'company' | 'registry') => {
    setInviteScope(scope)
    setIsScopeChoiceModalOpen(false)
    setIsInviteModalOpen(true)
  }

  const handleInvite = async (data: { email: string; firstName: string; lastName: string }) => {
    if (!session?.access_token) {
      throw new Error('Non authentifié')
    }

    const endpoint = inviteScope === 'company'
      ? '/api/collaboration/profile'
      : `/api/companies/${useCase.company_id}/collaborators`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de l\'invitation')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={useCaseRoutes.dashboard(useCase.company_id)}
          className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-gray-50 rounded-lg px-3 py-2 -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="text-sm font-medium">Retour au dashboard</span>
        </Link>

        <div className="flex items-center space-x-3">
          {/* Bouton Inviter un collaborateur - visible uniquement pour les owners */}
          {isOwner && (
            <button
              onClick={handleInviteClick}
              className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2"
              title="Inviter un collaborateur"
            >
              <UserPlus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium">Inviter un collaborateur</span>
            </button>
          )}

          {/* Bouton Télécharger PDF */}
          <button
            onClick={generatePDF}
            disabled={isGenerating || useCase.status?.toLowerCase() !== 'completed'}
            className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={useCase.status?.toLowerCase() !== 'completed' ? 'Le cas d\'usage doit être complété pour générer le PDF' : 'Télécharger le rapport PDF'}
          >
            {isGenerating ? (
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
            )}
            <span className="text-sm font-medium">
              {isGenerating ? 'Génération...' : 'Télécharger PDF'}
            </span>
          </button>

          <button
            onClick={handleDeleteClick}
            className="group inline-flex items-center text-gray-500 hover:text-red-600 transition-all duration-200 hover:bg-red-50 rounded-lg px-3 py-2"
            title="Supprimer le use case"
          >
            <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-sm font-medium">Supprimer</span>
          </button>
        </div>
      </div>

      {/* Message d'erreur PDF */}
      {pdfError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erreur de génération PDF</h3>
              <p className="text-sm text-red-700 mt-1">{pdfError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Ligne 1: Titre du cas d'usage (pleine largeur) */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Image
              src="/icons_dash/technology.png"
              alt="Icône technologie"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {useCase.name}
            </h1>
          </div>
        </div>

        {/* Lignes 2, 3, 4: Grille 3 colonnes */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Colonne gauche - Blocs empilés */}
          <div className="xl:col-span-3 space-y-4">
            {/* Ligne 2: Badge statut */}
            <div className="flex flex-wrap gap-2">
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={frenchStatus === 'Complété' ? {
                  backgroundColor: '#f1fdfa',
                  color: '#0080a3'
                } : frenchStatus === 'À compléter' ? {
                  backgroundColor: '#fefce8',
                  color: '#713f12'
                } : {}}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {frenchStatus}
              </div>
              {(() => {
                const deploymentStatus = getDeploymentStatus(useCase.deployment_date)
                const statusStyle = getDeploymentStatusColor(deploymentStatus)
                return (
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.border}`}
                    style={{
                      color: statusStyle.color,
                      backgroundColor: statusStyle.backgroundColor
                    }}
                  >
                    {deploymentStatus}
                  </div>
                )
              })()}
            </div>

            {/* Ligne 3: Modèle utilisé */}
            {useCase.compl_ai_models && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Modèle utilisé</h3>
                  <button
                    onClick={handleModelEdit}
                    className="text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="Modifier le modèle"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <Image
                    src={getProviderIcon(useCase.compl_ai_models?.model_provider)}
                    alt={useCase.compl_ai_models?.model_provider || 'Provider'}
                    width={24}
                    height={24}
                    className="w-6 h-6"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span className="text-sm text-gray-600">{useCase.compl_ai_models.model_name}</span>
                </div>
                {useCase.compl_ai_models.model_provider && (
                  <div className="text-xs text-gray-500 mt-1">
                    {useCase.compl_ai_models.model_provider}
                  </div>
                )}
              </div>
            )}

            {/* Ligne 4: Pays de déploiement */}
            <div className="w-full">
              <CountryDeploymentDisplay
                deploymentCountries={useCase.deployment_countries}
                onUpdateUseCase={onUpdateUseCase ? async (updates) => {
                  await onUpdateUseCase(updates)
                } : undefined}
                updating={updating}
                className="max-w-full"
              />
            </div>
          </div>

          {/* Colonne centre - Carte géographique (s'étend sur 3 lignes) */}
          <div className="xl:col-span-6 flex justify-center">
            <div className="bg-gray-50 rounded-lg p-4 w-full">
              <WorldMap
                deploymentCountries={useCase.deployment_countries || []}
                className="w-full h-80"
              />
            </div>
          </div>

          {/* Colonne droite - Blocs empilés */}
          <div className="xl:col-span-3 space-y-4">
            {/* Ligne 2: Niveau IA Act */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Niveau IA Act</h3>
              {useCase.score_final === 0 ? (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">
                    Risque Inacceptable
                  </span>
                </div>
              ) : (
                <RiskLevelBadge
                  riskLevel={riskLevel}
                  loading={riskLoading}
                  error={riskError}
                  className="w-full"
                />
              )}
            </div>

            {/* Ligne 3: Score de conformité */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
              <HeaderScore useCaseId={useCase.id} />
            </div>

            {/* Ligne 4: Bouton réévaluer */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
              <button
                onClick={goToEvaluation}
                disabled={updating}
                className="w-full bg-[#0080a3] text-white px-4 py-2 rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <RefreshCcw className="h-4 w-4" />
                <span>Réévaluer le cas d'usage</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sélection de modèle */}
      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        currentModel={useCase.compl_ai_models || null}
        onSave={handleModelSave}
        saving={updating}
      />

      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        useCaseName={useCase.name}
        deleting={isDeleting}
      />

      {/* Modal de choix du scope d'invitation */}
      <InviteScopeChoiceModal
        isOpen={isScopeChoiceModalOpen}
        onClose={() => setIsScopeChoiceModalOpen(false)}
        onSelectScope={handleScopeSelect}
      />

      {/* Modal d'invitation de collaborateur */}
      <InviteCollaboratorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        scope={inviteScope}
      />
    </div>
  )
} 