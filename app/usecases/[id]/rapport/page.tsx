'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { RiskLevelBadge } from '../components/overview/RiskLevelBadge'
import { useRiskLevel } from '../hooks/useRiskLevel'
import { useUseCaseScore } from '../hooks/useUseCaseScore'
import { useNextSteps } from '../hooks/useNextSteps'
import { getScoreStyle } from '@/lib/score-styles'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

// Fonction utilitaire pour convertir le statut d'entreprise en libellé lisible
function getCompanyStatusLabel(status?: string): string {
  switch (status) {
    case 'utilisateur':
      return 'Utilisateur (Déployeur)';
    case 'fabriquant_produits':
      return 'Fabricant de Produits';
    case 'distributeur':
      return 'Distributeur';
    case 'importateur':
      return 'Importateur';
    case 'fournisseur':
      return 'Fournisseur';
    case 'mandataire':
      return 'Mandataire (Représentant autorisé)';
    case 'unknown':
    default:
      return 'Non déterminé';
  }
}

// Fonction utilitaire pour obtenir la définition du statut d'entreprise selon l'IA Act
function getCompanyStatusDefinition(status?: string): string {
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
}

// Hook pour récupérer les informations de profil de l'utilisateur
function useUserProfile() {
  const { user, session } = useAuth()
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !session?.access_token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Profile fetched:', data)
          setProfile(data)
        } else {
          console.error('Failed to fetch profile:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, session?.access_token])

  return { profile, loading }
}

export default function UseCaseRapportPage() {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { nextSteps, loading: nextStepsLoading, error: nextStepsError, refetch: refetchNextSteps } = useNextSteps({
    usecaseId: useCaseId,
    useCaseStatus: useCase?.status,
    useCaseUpdatedAt: useCase?.updated_at
  })
  const { goToEvaluation, goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')
  const { riskLevel, loading: riskLoading, error: riskError } = useRiskLevel(useCaseId)
  const { score, loading: scoreLoading, error: scoreError } = useUseCaseScore(useCaseId)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return <UseCaseLoader />
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (loadingData) {
    return <UseCaseLoader message="Chargement du cas d'usage..." />
  }

  if (error || !useCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">
            {error || "Le cas d'usage n'a pas pu être chargé."}
          </p>
          <button
            onClick={goToCompanies}
            className="inline-flex items-center px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  // Redirect to evaluation if still draft
  if (useCase.status?.toLowerCase() === 'draft') {
    return (
      <UseCaseLayout useCase={useCase}>
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Évaluation requise
          </h2>
          <p className="text-gray-600 mb-6">
            Ce cas d'usage doit d'abord être évalué avant de pouvoir consulter le rapport.
          </p>
          <button
            onClick={goToEvaluation}
            className="inline-flex items-center px-6 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
          >
            Commencer l'évaluation
          </button>
        </div>
      </UseCaseLayout>
    )
  }

  // Fonction pour formater le nom de l'auditeur
  const getAuditorName = () => {
    console.log('Profile data for auditor name:', profile)
    
    if (profile?.email) {
      console.log('Using email:', profile.email)
      return profile.email
    } else {
      console.log('Using fallback name')
      return 'MaydAI - Équipe Conformité'
    }
  }

  return (
    <UseCaseLayout useCase={useCase}>
      <div className="space-y-6 sm:space-y-8">
        {/* Section d'informations du rapport d'audit */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Rapport d'Audit Préliminaire du Système d'IA : <span className="text-[#0080a3]">{useCase.name || 'Nom du Cas d\'usage IA'}</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Entreprise :</span>
                <span className="text-gray-900">{useCase.companies?.name || 'Nom de l\'entreprise'}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Date du Rapport :</span>
                <span className="text-gray-900">
                  {useCase.last_calculation_date 
                    ? new Date(useCase.last_calculation_date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : new Date().toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Audité par :</span>
                <span className="text-gray-900">
                  {profileLoading ? 'Chargement...' : getAuditorName()}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-bold text-gray-700 mb-1">Service concerné :</span>
                <span className="text-gray-900">{useCase.responsible_service || 'Nom du service'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1. Résumé Exécutif */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            1. Résumé Exécutif
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Ce rapport réalisé par l'entreprise <strong className="text-[#0080a3]">{useCase.companies?.name || '[Nom de l\'entreprise]'}</strong> présente les conclusions d'un audit préliminaire du système d'IA <strong className="text-[#0080a3]">{useCase.name || '[Nom du système]'}</strong> au regard des exigences du règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 établissant des règles harmonisées concernant l'intelligence artificielle « AI Act ».
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Statut de l'entreprise :</strong> <span className="text-[#0080a3]">{getCompanyStatusLabel(useCase.company_status)}</span>
            </p>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border mb-4">
              <p className="font-medium text-gray-800 mb-2">Définition IA Act :</p>
              <p className="text-gray-700 leading-relaxed">{getCompanyStatusDefinition(useCase.company_status)}</p>
            </div>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              <strong>Résumé du cas d'usage :</strong> {useCase.description || '[Description du cas d\'usage]'}
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              L'objectif de cet audit préliminaire est d'identifier les domaines de conformité actuels et les lacunes, afin de proposer des actions correctives immédiates (quick wins) et des plans d'action à moyen et long terme, en soulignant les spécificités des grands modèles linguistiques (LLM) et de leur transparence.
            </p>
            
            <p className="text-base leading-relaxed text-gray-800 mb-4">
              Une partie des conclusions de cette évaluation est basée sur les tests effectués par l'équipe MayDAI sur les principaux LLM dont <strong className="text-[#0080a3]">{useCase.compl_ai_models?.model_name || useCase.llm_model_version || '[Nom du modèle utilisé]'}</strong>. Si certaines lacunes en matière de robustesse, de sécurité, de diversité et d'équité peuvent être relevées, d'autres informations demandées par l'AI Act ne sont pas encore disponibles (ou transmises par les technologies concernées).
            </p>
            
            <p className="text-base leading-relaxed text-gray-800">
              Ce rapport vise à fournir une feuille de route aux entreprises pour naviguer dans ce paysage réglementaire complexe.
            </p>
          </div>
        </div>

        {/* Section 2. Classification du système d'IA */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            2. Classification du système d'IA
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              L'AI Act adopte une approche fondée sur les risques, classifiant les systèmes d'IA en différentes catégories selon leur niveau de risque. Cette classification détermine les obligations réglementaires applicables.
            </p>
            
            {/* Badges de classification et score */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Badge Niveau IA Act */}
              <div className="flex-1">
                {riskLoading ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="relative">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2 animate-pulse">--</div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-2 flex items-center justify-center">
                        <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                        Analyse en cours...
                      </div>
                    </div>
                  </div>
                ) : riskError || !riskLevel ? (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Niveau IA Act
                    </h3>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                      <div className="text-3xl font-bold text-gray-400 mb-2">--</div>
                      <div className="text-xs text-gray-500">Non disponible</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        riskLevel === 'unacceptable' ? 'bg-red-500' :
                        riskLevel === 'high' ? 'bg-orange-500' :
                        riskLevel === 'limited' ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}></div>
                      Niveau IA Act
                    </h3>
                    
                    <div className={`rounded-xl p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${
                      riskLevel === 'unacceptable' ? 'bg-red-50 border-red-200' :
                      riskLevel === 'high' ? 'bg-orange-50 border-orange-200' :
                      riskLevel === 'limited' ? 'bg-amber-50 border-amber-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-center relative">
                        <div className={`text-3xl font-bold mb-2 ${
                          riskLevel === 'unacceptable' ? 'text-red-800' :
                          riskLevel === 'high' ? 'text-orange-800' :
                          riskLevel === 'limited' ? 'text-amber-800' :
                          'text-green-800'
                        }`}>
                          {riskLevel === 'unacceptable' ? 'Inacceptable' :
                           riskLevel === 'high' ? 'Élevé' :
                           riskLevel === 'limited' ? 'Limité' :
                           'Minimal'}
                        </div>
                        
                        {riskLevel === 'unacceptable' && (
                          <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Interdit
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Badge Score de conformité */}
              <div className="flex-1">
                {scoreLoading ? (
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
                        Recalcul en cours...
                      </div>
                    </div>
                  </div>
                ) : scoreError || !score ? (
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
                ) : (
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getScoreStyle(score.score).indicator}`}></div>
                      Score de conformité
                    </h3>
                    
                    <div className={`${getScoreStyle(score.score).bg} rounded-xl p-4 border ${getScoreStyle(score.score).border} ${getScoreStyle(score.score).shadow} shadow-sm hover:shadow-md transition-all duration-200`}>
                      <div className="text-center relative">
                        <div className={`text-3xl font-bold ${getScoreStyle(score.score).text} mb-2`}>
                          {Math.round(score.score)}
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
                )}
              </div>
            </div>
            
            {/* Justification du niveau de risque */}
            {riskLevel && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Justification du niveau de risque</h4>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {riskLevel === 'unacceptable' && (
                    <p>
                      <strong>Risque inacceptable :</strong> Le système est potentiellement interdit en vertu de l'Article 5 de l'AI Act. Les pratiques interdites incluent la manipulation subliminale, l'exploitation des vulnérabilités, la notation sociale, l'évaluation des risques criminels basée sur le profilage, le raclage non ciblé d'images faciales, la reconnaissance des émotions sur le lieu de travail/établissements d'enseignement (sauf médical/sécurité), et l'identification biométrique à distance en temps réel dans les espaces publics (sauf exceptions strictes). L'interdiction de ces systèmes a pris effet le 2 février 2025.
                    </p>
                  )}
                  
                  {riskLevel === 'high' && (
                    <p>
                      <strong>Risque élevé :</strong> Le système tombe dans l'une des catégories listées à l'Annexe III de l'AI Act ou est un composant de sécurité d'un produit réglementé. Cela inclut par exemple l'IA dans les infrastructures critiques, l'éducation, l'emploi, l'accès aux services essentiels, l'application de la loi, la migration, l'asile, le contrôle aux frontières et l'administration de la justice. Ces systèmes sont soumis à des exigences strictes (évaluation et atténuation des risques, qualité des données, journalisation, documentation, transparence, contrôle humain, robustesse, cybersécurité, précision).
                    </p>
                  )}
                  
                  {riskLevel === 'limited' && (
                    <p>
                      <strong>Risque limité :</strong> Les systèmes d'IA à risque limité sont ceux pour lesquels il existe un besoin spécifique de transparence. La justification principale de cette classification est d'assurer que les utilisateurs soient informés lorsqu'ils interagissent avec une IA, en particulier s'il existe un risque manifeste de manipulation. Cela inclut les applications comme les chatbots, où les utilisateurs doivent savoir qu'ils communiquent avec une machine pour prendre des décisions éclairées. Cette catégorie englobe également les systèmes d'IA générative qui produisent des contenus synthétiques (audio, images, vidéo ou texte) ; les fournisseurs doivent s'assurer que ces contenus sont marqués de manière lisible par machine et identifiables comme étant générés ou manipulés par une IA. De même, les déployeurs de systèmes de reconnaissance des émotions ou de catégorisation biométrique doivent informer les personnes exposées de leur fonctionnement, et ceux qui utilisent l'IA pour générer des hyper trucages doivent clairement indiquer que le contenu a été créé ou manipulé par une IA. Ces exigences de transparence visent à préserver la confiance et à lutter contre les risques de manipulation, de tromperie et de désinformation.
                    </p>
                  )}
                  
                  {riskLevel === 'minimal' && (
                    <p>
                      <strong>Risque minimal :</strong> La vaste majorité des systèmes d'IA tombent dans cette catégorie, considérée comme présentant un risque minimal, voire nul. Ces systèmes sont généralement utilisés à condition de respecter la législation existante et ne sont soumis à aucune obligation légale supplémentaire spécifique à l'AI Act. La justification est que ces applications ne posent pas de risques significatifs pour la santé, la sécurité ou les droits fondamentaux des personnes. Les fournisseurs de ces systèmes sont néanmoins encouragés à appliquer volontairement les exigences relatives à une "IA digne de confiance" et à adhérer à des codes de conduite volontaires. Cette approche vise à promouvoir une utilisation éthique et responsable de l'IA sans entraver l'innovation, offrant ainsi un avantage concurrentiel aux entreprises qui respectent ces bonnes pratiques. Des exemples typiques incluent les jeux vidéo basés sur l'IA ou les filtres anti-spam.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            3. Évaluation de la Conformité et Actions Recommandées
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              Cette section évalue la conformité du système d'IA aux exigences de l'AI Act, structurée autour des six principes éthiques et techniques clés. Pour chaque point, des quick wins (actions rapides) et des actions à mener sont proposées.
            </p>
          </div>
        </div>

        {/* Section : Recommandations et plan d'action */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Recommandations et plan d'action
          </h2>
          
          {/* Bande d'information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Rapport généré le {useCase?.updated_at ? new Date(useCase.updated_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Date non disponible'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Généré par IA</span>
              </div>
            </div>
          </div>
          
          {nextStepsLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-[#0080a3] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des recommandations...</p>
            </div>
          )}

          {nextStepsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <p className="text-sm text-red-700 mt-1">{nextStepsError}</p>
                </div>
              </div>
            </div>
          )}

          {nextSteps && (
            <div className="space-y-6">
              {/* Introduction */}
              {nextSteps.introduction && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Introduction</h3>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                      {nextSteps.introduction}
                    </p>
                  </div>
                </div>
              )}

              {/* Évaluation du niveau de risque AI Act */}
              {nextSteps.evaluation && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/low-performance.png" 
                      alt="Évaluation du risque" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Évaluation du niveau de risque AI Act</h3>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                      {nextSteps.evaluation}
                    </p>
                  </div>
                </div>
              )}

              {/* Priorités d'actions réglementaires */}
              {nextSteps.priorite_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/attention.png" 
                      alt="Actions prioritaires" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Il est impératif de mettre en œuvre les mesures suivantes :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Les 3 priorités d'actions réglementaires</h4>
                  <ul className="space-y-2 mb-4 ml-4">
                    {[nextSteps.priorite_1, nextSteps.priorite_2, nextSteps.priorite_3]
                      .filter(Boolean)
                      .map((action, index) => (
                        <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                          <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                          <span className="flex-1">
                            {action}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Quick wins */}
              {nextSteps.quick_win_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/work-in-progress.png" 
                      alt="Actions rapides" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Trois actions concrètes à mettre en œuvre rapidement :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Quick wins & actions immédiates recommandées</h4>
                  <ul className="space-y-2 mb-4 ml-4">
                    {[nextSteps.quick_win_1, nextSteps.quick_win_2, nextSteps.quick_win_3]
                      .filter(Boolean)
                      .map((action, index) => (
                        <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                          <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                          <span className="flex-1">
                            {action}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Actions moyen terme */}
              {nextSteps.action_1 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/schedule.png" 
                      alt="Actions à moyen terme" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Trois actions structurantes à mener dans les 3 à 6 mois :</h3>
                  </div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3 italic">Actions à moyen terme</h4>
                  <ul className="space-y-2 mb-4 ml-4">
                    {[nextSteps.action_1, nextSteps.action_2, nextSteps.action_3]
                      .filter(Boolean)
                      .map((action, index) => (
                        <li key={index} className="text-base leading-relaxed text-gray-800 flex items-center">
                          <span className="text-[#0080a3] mr-2 text-6xl">•</span>
                          <span className="flex-1">
                            {action}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Impact attendu */}
              {nextSteps.impact && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/icons/administrative-law.png" 
                      alt="Impact attendu" 
                      width={24} 
                      height={24} 
                      className="flex-shrink-0"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Impact attendu</h3>
                  </div>
                  <p className="text-base leading-relaxed text-gray-800">{nextSteps.impact}</p>
                </div>
              )}

              {/* Conclusion */}
              {nextSteps.conclusion && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Conclusion</h3>
                  <p className="text-base leading-relaxed text-gray-800">{nextSteps.conclusion}</p>
                </div>
              )}
            </div>
          )}

          {!nextSteps && !nextStepsLoading && !nextStepsError && (
            <div className="text-center py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <svg className="w-12 h-12 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Aucune recommandation disponible</h3>
                <p className="text-blue-700">
                  Les recommandations détaillées seront générées automatiquement une fois le questionnaire d'évaluation complété.
                </p>
              </div>
            </div>
          )}
        </div>


        {/* Section 4. Recommandations Générales */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            4. Recommandations Générales
          </h2>
          
          <div className="space-y-6">
            {/* Intégration par design */}
            <div className="flex items-start">
              <img 
                src="/icons/compass-icon.png" 
                alt="Intégration par design" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Intégration « par design »</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Intégrer les principes de l'AI Act dès la conception des produits et services IA pour assurer la pérennité et la compétitivité.
                </p>
              </div>
            </div>

            {/* Évaluation Continue */}
            <div className="flex items-start">
              <img 
                src="/icons/audit.png" 
                alt="Évaluation Continue" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Évaluation Continue</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  L'AI est une technologie en évolution rapide. Il est crucial de procéder à des évaluations régulières et d'adapter les systèmes et les processus de conformité en continu.
                </p>
              </div>
            </div>

            {/* Formation */}
            <div className="flex items-start">
              <img 
                src="/icons/authenticity.png" 
                alt="Formation" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Formation</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Sensibiliser et former toutes les équipes (développement, juridique, conformité, gestion) aux exigences de l'AI Act et aux meilleures pratiques en matière d'IA éthique et transparente.
                </p>
              </div>
            </div>

            {/* Outils de Conformité */}
            <div className="flex items-start">
              <img 
                src="/icons/authorization.png" 
                alt="Outils de Conformité" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Outils de Conformité</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  Utiliser des boîtes à outils dédiées (telles que celles de MaydAI ou le cadre COMPL-AI) pour faciliter l'identification des systèmes, la classification des risques, la cartographie des obligations réglementaires et la gestion des risques.
                </p>
              </div>
            </div>

            {/* Bac à Sable Réglementaire */}
            <div className="flex items-start">
              <img 
                src="/icons/sandbox.png" 
                alt="Bac à Sable Réglementaire" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Bac à Sable Réglementaire</h3>
                <div className="text-gray-800 text-sm leading-relaxed">
                  <p className="mb-3">
                    Envisager la participation à des « bacs à sable réglementaires » (regulatory sandboxes) pour développer et tester des systèmes d'IA innovants sous supervision réglementaire, ce qui peut renforcer la sécurité juridique et accélérer l'accès au marché pour les PME.
                  </p>
                  <a 
                    href="https://artificialintelligenceact.eu/fr/article/57/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#0080a3] hover:text-[#006080] underline font-medium"
                  >
                    En savoir plus sur les bacs à sable réglementaires
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Collaboration */}
            <div className="flex items-start">
              <img 
                src="/icons/teamwork.png" 
                alt="Collaboration" 
                width={24} 
                height={24} 
                className="mr-4 mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Collaboration</h3>
                <div className="text-gray-800 text-sm leading-relaxed">
                  <p className="mb-3">
                    Participer aux efforts de standardisation et de développement de codes de bonne pratique, encouragés par le Bureau de l'IA.
                  </p>
                  <a 
                    href="https://digital-strategy.ec.europa.eu/fr/policies/ai-office" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[#0080a3] hover:text-[#006080] underline font-medium"
                  >
                    Découvrir le Bureau de l'IA
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Section 6. Références Légales Clés — déplacée vers l'onglet Annexes */}

      </div>
    </UseCaseLayout>
  )
}