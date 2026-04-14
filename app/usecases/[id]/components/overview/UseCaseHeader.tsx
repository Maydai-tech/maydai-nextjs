import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UseCase, Progress } from '../../types/usecase'
import { ComplAIModel } from '@/lib/supabase'
import { getStatusColor, getUseCaseStatusInFrench } from '../../utils/questionnaire'
import { useCaseRoutes, withEvaluationEntree } from '../../utils/routes'
import { useUseCaseNavigation } from '../../utils/navigation'
import { ArrowLeft, CheckCircle, Clock, Edit3, RefreshCcw, AlertTriangle, Trash2, Download, UserPlus, Calendar, History } from 'lucide-react'
import Image from 'next/image'
import ModelSelectorModal from '../ModelSelectorModal'
import DeleteConfirmationModal from '../DeleteConfirmationModal'
import { RiskLevelBadge } from './RiskLevelBadge'
import { useUseCaseRisk } from '../../context/UseCaseRiskContext'
import { CountryDeploymentDisplay } from './CountryDeploymentDisplay'
import { useAuth } from '@/lib/auth'
import WorldMap from '@/components/WorldMap'
import { getProviderIcon } from '@/lib/provider-icons'
import { getScoreStyle } from '@/lib/score-styles'
import { usePDFExport } from '../../hooks/usePDFExport'
import { V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER } from '@/lib/classification-risk-display'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'
import { resolveV3ShortPathFunnelOutcomeKey } from '../../utils/v3-short-path-funnel-context'
import { trackV3ShortPathCta, v3ShortPathSystemTypeBucket } from '@/lib/v3-short-path-analytics'
import { showV3DualPathEntrypoints } from '../../utils/v3-dual-path-ui'
import { useUseCaseScore } from '../../hooks/useUseCaseScore'
import { useCompanyInfo } from '../../hooks/useCompanyInfo'
import InviteScopeChoiceModal from '@/components/Collaboration/InviteScopeChoiceModal'
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal'
import { DatePickerModal } from '../shared/DatePickerModal'
import UseCaseHistoryModal from './UseCaseHistoryModal'

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
  const { classificationStatus } = useUseCaseRisk()
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
        {score.score_scope === 'short_initial' ? 'Score initial (parcours court)' : 'Score de conformité'}
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
      <a
        href="#scores-description"
        className="mt-3 block text-xs text-[#0080A3] hover:text-[#006280] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-1 rounded"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('scores-description')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      >
        Comment est calculé ce score ?
      </a>
      {score.score_scope === 'short_initial' && score.score_display_hint ? (
        <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">{score.score_display_hint}</p>
      ) : null}
      {classificationStatus === 'impossible' && (
        <p className="mt-3 text-xs text-violet-900 leading-relaxed p-2 rounded-lg border border-violet-200 bg-violet-50/90">
          {V3_IMPOSSIBLE_MATURITY_SCORES_DISCLAIMER}
        </p>
      )}
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // État pour l'édition de la date de déploiement
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isSavingDeploymentDate, setIsSavingDeploymentDate] = useState(false)
  const { goToEvaluation } = useUseCaseNavigation(useCase.id, useCase.company_id)
  const showV3DualPath = showV3DualPathEntrypoints(useCase.questionnaire_version)
  const { riskLevel, classificationStatus, loading: riskLoading, error: riskError } = useUseCaseRisk()
  const headerFunnelKey = useMemo(
    () =>
      showV3DualPath
        ? resolveV3ShortPathFunnelOutcomeKey(classificationStatus, riskLevel)
        : null,
    [showV3DualPath, classificationStatus, riskLevel]
  )
  const { isGenerating, error: pdfError, successMessage: pdfSuccessMessage, generatePDF } = usePDFExport(useCase.id)
  const pdfBlocked =
    useCase.status?.toLowerCase() !== 'completed' || classificationStatus === 'impossible'
  const pdfButtonTitle =
    useCase.status?.toLowerCase() !== 'completed'
      ? 'Le cas d\'usage doit être complété pour générer le PDF'
      : classificationStatus === 'impossible'
        ? 'Export PDF indisponible : classification réglementaire impossible (pivots non tranchés).'
        : 'Télécharger le rapport PDF'
  const { isOwner } = useCompanyInfo(useCase.company_id)
  const router = useRouter()
  const { session } = useAuth()

  // Memoize deployment countries to prevent WorldMap flickering
  const deploymentCountries = useMemo(
    () => useCase.deployment_countries || [],
    [useCase.deployment_countries]
  )

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

      // Redirection vers le dashboard avec un message de succès (pas de nom dans l'URL)
      router.push(`/dashboard/${useCase.company_id}?deleted=true`)
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

  // Handler pour la sauvegarde de la date de déploiement
  const handleSaveDeploymentDate = async (newDate: string) => {
    if (!onUpdateUseCase || isSavingDeploymentDate) return

    setIsSavingDeploymentDate(true)
    try {
      await onUpdateUseCase({ deployment_date: newDate || undefined })
      setIsDatePickerOpen(false)
    } catch (error) {
      console.error('Failed to save deployment date:', error)
    } finally {
      setIsSavingDeploymentDate(false)
    }
  }

  // Formater la date pour l'affichage
  const formatDeploymentDate = (date?: string) => {
    if (!date) return 'Non spécifiée'
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    return date
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
            disabled={isGenerating || pdfBlocked}
            className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={pdfButtonTitle}
          >
            {isGenerating ? (
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
            )}
            <span className="text-sm font-medium">
              {isGenerating
                ? 'Génération PDF…'
                : pdfBlocked && classificationStatus === 'impossible'
                  ? 'PDF indisponible'
                  : 'Télécharger PDF'}
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

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="group inline-flex items-center text-gray-500 hover:text-[#0080A3] transition-all duration-200 hover:bg-blue-50 rounded-lg px-3 py-2"
            title="Voir l'historique des modifications"
          >
            <History className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-sm font-medium">Historique</span>
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

      {pdfSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-900">{pdfSuccessMessage}</p>
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
            <div className="rounded-lg border border-gray-200 bg-slate-50/90 px-3 py-2.5 text-xs text-gray-700 leading-relaxed max-w-3xl">
              <p className="font-semibold text-gray-900 mb-1">{DECLARATION_PROOF_FLOW_COPY.filRougeTitle}</p>
              <p className="mb-2">{DECLARATION_PROOF_FLOW_COPY.filRougeBody}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-medium text-[#0080A3]">
                <Link href={`/dashboard/${useCase.company_id}/dossiers/${useCase.id}`} className="hover:underline underline-offset-2">
                  {DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase}
                </Link>
                <span className="text-gray-300 hidden sm:inline" aria-hidden>
                  |
                </span>
                <Link href={`/dashboard/${useCase.company_id}/todo-list`} className="hover:underline underline-offset-2">
                  {DECLARATION_PROOF_FLOW_COPY.linkLabelTodo}
                </Link>
              </div>
            </div>
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

            {/* Ligne 4: Date de déploiement */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Date de déploiement</h3>
                {onUpdateUseCase && (
                  <button
                    onClick={() => setIsDatePickerOpen(true)}
                    className="text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="Modifier la date"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {formatDeploymentDate(useCase.deployment_date)}
                </span>
              </div>
            </div>

            {/* Ligne 5: Pays de déploiement */}
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
                deploymentCountries={deploymentCountries}
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
                    Risque inacceptable
                  </span>
                </div>
              ) : (
                <RiskLevelBadge
                  riskLevel={riskLevel}
                  classificationStatus={classificationStatus}
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

            {/* Ligne 4 : parcours V3 non terminé — affiner (long) / réévaluer (court) ; sinon réévaluation classique */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-full space-y-2">
              {showV3DualPath ? (
                <>
                  <Link
                    href={withEvaluationEntree(useCaseRoutes.evaluation(useCase.id), 'header_v3_refine_long')}
                    onClick={() =>
                      trackV3ShortPathCta({
                        usecase_id: useCase.id,
                        system_type_bucket: v3ShortPathSystemTypeBucket(useCase.system_type),
                        cta: 'evaluation_long',
                        cta_placement: 'header_v3_refine_long',
                        ...(headerFunnelKey && { outcome_funnel_key: headerFunnelKey }),
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0080a3] text-white px-4 py-2.5 rounded-lg hover:bg-[#006280] text-sm font-semibold shadow-sm"
                  >
                    <RefreshCcw className="h-4 w-4 shrink-0" aria-hidden />
                    Passer au Parcours Complet
                  </Link>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Accédez à l&apos;analyse détaillée et générez votre documentation de conformité.
                  </p>
                </>
              ) : (
                <button
                  onClick={() => goToEvaluation()}
                  disabled={updating}
                  className="w-full bg-[#0080a3] text-white px-4 py-2 rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Réévaluer le cas d&apos;usage</span>
                </button>
              )}
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

      {/* Modal de sélection de date de déploiement */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={handleSaveDeploymentDate}
        currentDate={useCase.deployment_date}
        title="Date de déploiement"
        saving={isSavingDeploymentDate}
      />

      {/* Modal d'historique des modifications */}
      <UseCaseHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        usecaseId={useCase.id}
        usecaseName={useCase.name}
      />
    </div>
  )
} 