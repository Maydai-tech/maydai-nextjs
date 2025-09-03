'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { UseCaseScore } from '../components/UseCaseScore'

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
  const { goToEvaluation, goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

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
            Retour aux entreprises
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

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Rapport de conformité
          </h2>
          
          <UseCaseScore usecaseId={useCase.id} />
        </div>
      </div>
    </UseCaseLayout>
  )
} 