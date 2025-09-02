'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { UseCaseScore } from '../components/UseCaseScore'

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