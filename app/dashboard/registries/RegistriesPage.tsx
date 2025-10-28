'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { Building2, Plus, ChevronRight, CheckCircle, X, MoreVertical, Trash2 } from 'lucide-react'
import Footer from '@/components/Footer'
import NavBar from '@/components/NavBar/NavBar'
import PlanLimitModal from '@/components/Shared/PlanLimitModal'
import DeleteRegistryModal from '@/app/dashboard/[id]/components/DeleteRegistryModal'

interface Company {
  id: string
  name: string
  role: string
}

export default function RegistriesPage() {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [registryToDelete, setRegistryToDelete] = useState<Company | null>(null)
  const [isDeletingRegistry, setIsDeletingRegistry] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const api = useApiCall()
  const { plan } = useUserPlan()

  // Prevent hydration mismatch and check for success message
  useEffect(() => {
    setMounted(true)

    // Check for deletion success message
    if (searchParams.get('deleted') === 'true') {
      const registryName = searchParams.get('registryName')
      setSuccessMessage(`Le registre "${registryName || 'Registre'}" a été supprimé avec succès`)

      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
        // Clean up the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('deleted')
        url.searchParams.delete('registryName')
        router.replace(url.pathname)
      }, 5000)
    }
  }, [searchParams, router])

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openMenuId])

  const handleDeleteRegistry = async () => {
    if (!registryToDelete || !session?.access_token) return

    setIsDeletingRegistry(true)
    try {
      const response = await fetch(`/api/companies/${registryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      // Rediriger avec message de succès
      router.push(`/dashboard/registries?deleted=true&registryName=${encodeURIComponent(registryToDelete.name)}`)

      // Rafraîchir la liste
      await fetchCompanies()
      setDeleteModalOpen(false)
      setRegistryToDelete(null)
    } catch (error) {
      console.error('Erreur lors de la suppression du registre:', error)
      alert('Une erreur est survenue lors de la suppression du registre')
      setIsDeletingRegistry(false)
      setDeleteModalOpen(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, company: Company) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId(null)
    setRegistryToDelete(company)
    setDeleteModalOpen(true)
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
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                      <div key={company.id} className="relative">
                        <Link
                          href={`/dashboard/${company.id}`}
                          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[#0080A3]/20 border border-transparent transition-all group block"
                        >
                          <div className="flex items-center justify-between pr-12">
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
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Dashboard</p>
                              <p className="text-xs text-gray-500">Conformité IA Act</p>
                            </div>
                          </div>
                        </Link>

                        {/* Actions Menu */}
                        <div className="absolute top-4 right-4" ref={openMenuId === company.id ? dropdownRef : null}>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === company.id ? null : company.id)
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>

                          {/* Dropdown Menu */}
                          {openMenuId === company.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={(e) => handleDeleteClick(e, company)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Supprimer le registre</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Plan Limit Modal */}
      <PlanLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={companies.filter(c => c.role === 'owner' || c.role === 'company_owner').length}
        maxLimit={plan.maxRegistries || 1}
        planName={plan.displayName}
        resourceType="registry"
      />

      {/* Delete Registry Modal */}
      <DeleteRegistryModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setRegistryToDelete(null)
        }}
        onConfirm={handleDeleteRegistry}
        registryName={registryToDelete?.name || ''}
        deleting={isDeletingRegistry}
      />
    </div>
  )
}
