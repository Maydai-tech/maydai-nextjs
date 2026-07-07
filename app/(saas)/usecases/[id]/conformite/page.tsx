'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUseCaseData } from '../hooks/useUseCaseData'
import { useUseCaseNavigation } from '../utils/navigation'
import { UseCaseLayout } from '../components/shared/UseCaseLayout'
import { UseCaseLoader } from '../components/shared/UseCaseLoader'
import { getCompanyStatusLabel, getCompanyStatusDefinition } from '../utils/company-status'


export default function UseCaseConformitePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [mounted, setMounted] = useState(false)

  const useCaseId = params.id as string
  const { useCase, loading: loadingData, error } = useUseCaseData(useCaseId)
  const { goToCompanies } = useUseCaseNavigation(useCaseId, useCase?.company_id || '')

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
            Ce cas d'usage doit d'abord être évalué avant de pouvoir consulter le rapport de conformité.
          </p>
        </div>
      </UseCaseLayout>
    )
  }

  return (
    <UseCaseLayout useCase={useCase}>
      <div className="space-y-6 sm:space-y-8">
        {/* Section 1. Obligations Spécifiques et Gouvernance */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            1. Obligations Spécifiques et Gouvernance
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              Cette section détaille les obligations spécifiques applicables à votre système d'IA selon sa classification et votre statut d'entreprise, ainsi que les mesures de gouvernance recommandées pour assurer une conformité durable.
            </p>
            
            <div className="space-y-6">
              {/* Obligations selon le statut d'entreprise */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="/icons/business.png" 
                    alt="Statut entreprise" 
                    width={24} 
                    height={24} 
                    className="flex-shrink-0"
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Obligations selon votre statut d'entreprise
                  </h3>
                </div>
                <div className="text-sm text-gray-800 leading-relaxed">
                  <p className="mb-3">
                    <strong>Statut identifié :</strong> {getCompanyStatusLabel(useCase.company_status)}
                  </p>
                  <p className="mb-4">
                    {getCompanyStatusDefinition(useCase.company_status)}
                  </p>
                  
                  {useCase.company_status === 'utilisateur' && (
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/account.png" 
                          alt="Utilisateur" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Obligations spécifiques aux utilisateurs :</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Utiliser le système d'IA conformément aux instructions du fournisseur</li>
                        <li>Surveiller le fonctionnement du système et signaler les incidents</li>
                        <li>Assurer un contrôle humain approprié</li>
                        <li>Respecter les obligations de transparence envers les utilisateurs finaux</li>
                      </ul>
                    </div>
                  )}
                  
                  {useCase.company_status === 'fournisseur' && (
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/account.png" 
                          alt="Fournisseur" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Obligations spécifiques aux fournisseurs :</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Évaluation et atténuation des risques</li>
                        <li>Qualité et gouvernance des données</li>
                        <li>Journalisation et traçabilité</li>
                        <li>Documentation technique et déclaration de conformité</li>
                        <li>Transparence et information des utilisateurs</li>
                        <li>Contrôle humain et surveillance</li>
                        <li>Robustesse, précision et cybersécurité</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Mesures de gouvernance recommandées */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="/icons/bank.png" 
                    alt="Gouvernance" 
                    width={24} 
                    height={24} 
                    className="flex-shrink-0"
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mesures de gouvernance recommandées
                  </h3>
                </div>
                <div className="text-sm text-gray-800 leading-relaxed">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/teamwork.png" 
                          alt="Organisation" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Organisation interne</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Désigner un responsable IA</li>
                        <li>Créer un comité de gouvernance IA</li>
                        <li>Établir des procédures de validation</li>
                        <li>Former les équipes aux enjeux IA</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/refresh-page-option.png" 
                          alt="Processus" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Processus qualité</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Audits réguliers de conformité</li>
                        <li>Tests de robustesse périodiques</li>
                        <li>Monitoring des performances</li>
                        <li>Gestion des incidents et remédiation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions prioritaires */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src="/icons/task.png" 
                    alt="Actions prioritaires" 
                    width={24} 
                    height={24} 
                    className="flex-shrink-0"
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Actions prioritaires à mettre en œuvre
                  </h3>
                </div>
                <div className="text-sm text-gray-800 leading-relaxed">
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/schedule.png" 
                          alt="Actions immédiates" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Actions immédiates (0-3 mois)</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Cartographier les systèmes d'IA existants</li>
                        <li>Évaluer la conformité actuelle</li>
                        <li>Identifier les lacunes critiques</li>
                        <li>Mettre en place un système de monitoring</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white p-4 rounded border">
                      <div className="flex items-center gap-3 mb-3">
                        <img 
                          src="/icons/calendar.png" 
                          alt="Actions moyen terme" 
                          width={20} 
                          height={20} 
                          className="flex-shrink-0"
                        />
                        <h4 className="font-semibold">Actions à moyen terme (3-12 mois)</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Développer la documentation technique</li>
                        <li>Implémenter les mesures de transparence</li>
                        <li>Renforcer les contrôles de qualité</li>
                        <li>Former les équipes aux obligations réglementaires</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2. Avertissements et Sanctions */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            2. Avertissements et Sanctions
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-base leading-relaxed text-gray-800 mb-6">
              Le non-respect de l'AI Act peut entraîner des sanctions sévères.
            </p>
            
            <div className="space-y-6">
              {/* Sanctions financières */}
              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Sanctions financières
                </h3>
                
                {/* Éléments des sanctions */}
                <div className="space-y-6">
                  {/* Violations des pratiques interdites */}
                  <div className="flex items-start">
                    <img 
                      src="/icons/withdraw.png" 
                      alt="Sanctions" 
                      width={24} 
                      height={24} 
                      className="mr-4 mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Violations des pratiques interdites (Article 5) :</h4>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        Amendes jusqu'à <strong className="text-[#0080a3]">35 millions d'euros</strong> ou <strong className="text-[#0080a3]">7 % du chiffre d'affaires annuel mondial</strong> (le montant le plus élevé).
                      </p>
                    </div>
                  </div>

                  {/* Violations des obligations pour les systèmes d'IA à haut risque */}
                  <div className="flex items-start">
                    <img 
                      src="/icons/auction.png" 
                      alt="Sanctions pour non-conformité" 
                      width={24} 
                      height={24} 
                      className="mr-4 mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Violations des obligations pour les systèmes d'IA à haut risque :</h4>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        Amendes jusqu'à <strong className="text-[#0080a3]">15 millions d'euros</strong> ou <strong className="text-[#0080a3]">3 % du chiffre d'affaires annuel mondial</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Fourniture d'informations inexactes */}
                  <div className="flex items-start">
                    <img 
                      src="/icons/lawyer.png" 
                      alt="Sanctions pour informations incorrectes" 
                      width={24} 
                      height={24} 
                      className="mr-4 mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Fourniture d'informations inexactes, incomplètes ou trompeuses :</h4>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        Amendes jusqu'à <strong className="text-[#0080a3]">7,5 millions d'euros</strong> ou <strong className="text-[#0080a3]">1 % du chiffre d'affaires annuel mondial</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendrier de mise en œuvre */}
              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Calendrier de mise en œuvre
                </h3>
                
                {/* Timeline Container */}
                <div className="relative">
                  {/* Ligne verticale */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#0080a3]"></div>
                  
                  {/* Éléments de la timeline */}
                  <div className="space-y-6">
                    {/* 2 février 2025 */}
                    <div className="relative flex items-start">
                      {/* Point de la timeline */}
                      <div className="absolute left-6 w-3 h-3 bg-white rounded-full transform -translate-x-1.5 z-10 border-2 border-[#0080a3]">
                        <div className="absolute inset-0.5 bg-[#0080a3] rounded-full"></div>
                      </div>
                      
                      {/* Contenu */}
                      <div className="ml-12 flex-1">
                        <div className="inline-flex items-center bg-[#0080a3] text-white text-sm font-medium px-3 py-1.5 rounded-full mb-3">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          2 février 2025
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">
                          Entrée en vigueur des interdictions des systèmes d'IA à « risque inacceptable ».
                        </p>
                      </div>
                    </div>

                    {/* 2 août 2025 */}
                    <div className="relative flex items-start">
                      {/* Point de la timeline */}
                      <div className="absolute left-6 w-3 h-3 bg-white rounded-full transform -translate-x-1.5 z-10 border-2 border-[#0080a3]">
                        <div className="absolute inset-0.5 bg-[#0080a3] rounded-full"></div>
                      </div>
                      
                      {/* Contenu */}
                      <div className="ml-12 flex-1">
                        <div className="inline-flex items-center bg-[#0080a3] text-white text-sm font-medium px-3 py-1.5 rounded-full mb-3">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          2 août 2025
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">
                          Application des réglementations pour les modèles d'IA à usage général (GPAI) et les règles de gouvernance. Les codes de bonnes pratiques ont été partagés le 5 juillet 2025.
                        </p>
                      </div>
                    </div>

                    {/* 2 août 2026 */}
                    <div className="relative flex items-start">
                      {/* Point de la timeline */}
                      <div className="absolute left-6 w-3 h-3 bg-white rounded-full transform -translate-x-1.5 z-10 border-2 border-[#0080a3]">
                        <div className="absolute inset-0.5 bg-[#0080a3] rounded-full"></div>
                      </div>
                      
                      {/* Contenu */}
                      <div className="ml-12 flex-1">
                        <div className="inline-flex items-center bg-[#0080a3] text-white text-sm font-medium px-3 py-1.5 rounded-full mb-3">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          2 août 2026
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">
                          Entrée en vigueur de toutes les autres dispositions de l'AI Act.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UseCaseLayout>
  )
}
