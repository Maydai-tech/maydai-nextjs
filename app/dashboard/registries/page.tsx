'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { Building2, Plus, ChevronRight } from 'lucide-react'
import Footer from '@/components/Footer'
import NavBar from '@/components/NavBar/NavBar'
import RegistryLimitModal from '@/components/Registries/RegistryLimitModal'

interface Company {
  id: string
  name: string
  role: string
}

export default function CompanySelection() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const api = useApiCall()
  const { plan } = useUserPlan()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (user && mounted) {
      fetchCompanies()
    }
  }, [user, mounted])

  const fetchCompanies = async () => {
    try {
      setLoadingData(true)
      
      if (!user) {
        return
      }
      
      const result = await api.get('/api/companies')
      
      if (result.data) {
        setCompanies(result.data)
      } else if (result.error) {
        console.error('Erreur lors du chargement des registres:', result.error)
      }
    } catch (error) {
      console.error('Error fetching registries:', error)
    } finally {
      setLoadingData(false)
    }
  }


  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      {/* Bandeau principal modifié */}
      <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-6 px-4 flex flex-col items-center justify-center text-center min-h-[20vh]">
        <div className="max-w-4xl mx-auto z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Bienvenue sur <span className="text-[#ffab5a]">MaydAI la plateforme de conformité AI Act</span>
          </h1>
          {/* Logo conformité IA - Centré sous le texte */}
          <div className="flex justify-center mt-6">
            <Image 
              src="/logos/logo-conformite-ia.svg" 
              alt="Logo conformité IA" 
              width={128}
              height={128}
              className="w-20 md:w-32 opacity-80 pointer-events-none select-none"
              priority
            />
          </div>
        </div>
      </section>

      {/* Section de sélection des entreprises */}
      <div className="max-w-4xl mx-auto py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Vos registres
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sélectionnez le registre sur lequel vous souhaitez travailler pour accéder au dashboard de conformité IA Act.
          </p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
            <span className="ml-3 text-gray-600">Chargement des registres...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Companies List */}
            {companies.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                <div className="bg-gray-50 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                  <Building2 className="h-8 w-8 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Aucun registre trouvé</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Commencez par créer votre premier registre pour accéder au dashboard de conformité IA Act.
                </p>
                <Link
                  href="/registries/new"
                  className="inline-flex items-center px-6 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Créer un registre
                </Link>
              </div>
            ) : (
              <>
                {/* Owned/Admin Registries Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">Mes registres</h3>
                  <div className="grid gap-4 sm:gap-6">
                    {companies.filter((company) => (company.role === 'owner' || company.role === 'company_owner')).map((company) => (
                      <Link
                        key={company.id}
                        href={`/dashboard/${company.id}`}
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[#0080A3]/20 border border-transparent transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-[#0080A3]/10 p-3 rounded-lg group-hover:bg-[#0080A3]/20 transition-colors">
                              <Building2 className="h-6 w-6 text-[#0080A3]" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 group-hover:text-[#0080A3] transition-colors">
                                {company.name}
                              </h4>
                              <p className="text-xs text-gray-500">Propriétaire</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Dashboard</p>
                              <p className="text-xs text-gray-500">Conformité IA Act</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#0080A3] transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Add New Company */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200 p-6 hover:border-[#0080A3]/50 transition-colors">
                  <button
                    onClick={() => {
                      const ownedRegistriesCount = companies.filter(c => c.role === 'owner' || c.role === 'company_owner').length
                      const maxRegistries = plan.maxRegistries || 1

                      if (ownedRegistriesCount >= maxRegistries) {
                        setShowLimitModal(true)
                      } else {
                        router.push('/registries/new')
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-3 text-gray-600 hover:text-[#0080A3] transition-colors group"
                  >
                    <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#0080A3]/10 transition-colors">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Ajouter un nouveau registre</span>
                  </button>
                </div>

                {/* Collaborator Registries Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">Registres collaboratifs</h3>
                  <div className="grid gap-4 sm:gap-6">
                    { companies.filter((company) => company.role === 'user').length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                        <p className="text-gray-600">Vous n'avez accès à aucun registre collaboratif</p>
                      </div>
                    ) : (
                      companies.filter((company) => company.role === 'user').map((company) => (
                      <Link
                        key={company.id}
                        href={`/dashboard/${company.id}`}
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-purple-500/20 border border-transparent transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-purple-50 p-3 rounded-lg group-hover:bg-purple-100 transition-colors">
                              <Building2 className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                {company.name}
                              </h4>
                              <p className="text-xs text-gray-500">Collaborateur</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Dashboard</p>
                              <p className="text-xs text-gray-500">Conformité IA Act</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                          </div>
                        </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Registry Limit Modal */}
      <RegistryLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={companies.filter(c => c.role === 'owner' || c.role === 'company_owner').length}
        maxLimit={plan.maxRegistries || 1}
        planName={plan.displayName}
      />
    </div>
  )
} 