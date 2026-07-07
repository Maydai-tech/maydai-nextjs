'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useApiCall } from '@/lib/api-client-legacy'
import { useUserPlan } from '@/app/(saas)/abonnement/hooks/useUserPlan'
import {
  Building2,
  Plus,
  ChevronRight,
  CheckCircle,
  X,
  MoreVertical,
  Trash2,
  Shield,
  Folder,
  FolderPlus,
  Briefcase,
  Users,
  Lock,
  Server,
  ShieldCheck,
} from 'lucide-react'
import Footer from '@/components/site-vitrine/Footer'
import NavBar from '@/components/NavBar/NavBar'
import PlanLimitModal from '@/components/Shared/PlanLimitModal'
import { trackLimitReached } from '@/lib/gtm'
import DeleteRegistryModal from '@/app/(saas)/dashboard/[id]/components/DeleteRegistryModal'
import SecurityLogosGrid from '@/components/ui/SecurityLogosGrid'
import type { DashboardMetrics } from '@/lib/validations/dashboard-metrics'

export interface Company {
  id: string
  name: string
  role: string
}

interface RegistriesPageProps {
  initialMetrics: DashboardMetrics
  initialCompanies: Company[]
}

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'

const METRIC_CARDS = [
  {
    key: 'activeRegistries' as const,
    label: 'Registres actifs',
    icon: Folder,
    ariaLabel: (value: number) =>
      `${value} registre${value > 1 ? 's' : ''} actif${value > 1 ? 's' : ''}`,
  },
  {
    key: 'evaluatedUsecases' as const,
    label: 'Cas d\'usage',
    icon: Briefcase,
    ariaLabel: (value: number) =>
      `${value} cas d'usage enregistré${value > 1 ? 's' : ''}`,
  },
  {
    key: 'invitedCollaborators' as const,
    label: 'Collaborateurs invités',
    icon: Users,
    ariaLabel: (value: number) =>
      `${value} collaborateur${value > 1 ? 's' : ''} invité${value > 1 ? 's' : ''}`,
  },
]

const SECURITY_BULLETS = [
  { icon: Server, label: 'Hébergement 100% français (OVHcloud)' },
  { icon: Lock, label: 'Chiffrement TLS 1.3 de bout en bout' },
  { icon: ShieldCheck, label: 'Conformité RGPD garantie' },
]

function normalizeCompanies(companies: Company[]): Company[] {
  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    role: company.role ?? 'user',
  }))
}

export default function RegistriesPage({
  initialMetrics,
  initialCompanies,
}: RegistriesPageProps) {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [companies, setCompanies] = useState<Company[]>(() =>
    normalizeCompanies(initialCompanies)
  )
  const [dashboardMetrics, setDashboardMetrics] = useState(initialMetrics)
  const [isRefetching, setIsRefetching] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [registryToDelete, setRegistryToDelete] = useState<Company | null>(null)
  const [isDeletingRegistry, setIsDeletingRegistry] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const api = useApiCall()
  const { plan } = useUserPlan()

  const ownedRegistries = companies.filter(
    (company) => company.role === 'owner' || company.role === 'company_owner'
  )
  const collaboratorRegistries = companies.filter((company) => company.role === 'user')

  const refetchCompanies = useCallback(async () => {
    if (!user) return

    try {
      setIsRefetching(true)
      const result = await api.get('/api/companies')

      if (result.data) {
        setCompanies(normalizeCompanies(result.data))
      } else if (result.error) {
        console.error('Erreur lors du rechargement des registres:', result.error)
      }
    } catch (error) {
      console.error('Error refetching registries:', error)
    } finally {
      setIsRefetching(false)
    }
  }, [api, user])

  useEffect(() => {
    setMounted(true)

    if (searchParams.get('deleted') === 'true') {
      setSuccessMessage('Le registre a été supprimé avec succès')

      const timeoutId = window.setTimeout(() => {
        setSuccessMessage(null)
        const url = new URL(window.location.href)
        url.searchParams.delete('deleted')
        router.replace(url.pathname)
      }, 5000)

      return () => window.clearTimeout(timeoutId)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      void refetchCompanies()
      router.replace('/dashboard/registries')
    }
  }, [searchParams, refetchCompanies, router])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (!user?.id) return

    const refetchProfileCompleteness = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('completeness_score')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[Dashboard] Échec relecture completeness_score:', error)
        return
      }

      if (data?.completeness_score == null) return

      setDashboardMetrics((prev) =>
        prev.profileCompleteness === data.completeness_score
          ? prev
          : { ...prev, profileCompleteness: data.completeness_score }
      )
    }

    void refetchProfileCompleteness()
  }, [user?.id])

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

  const handleCreateRegistryClick = () => {
    const maxRegistries = plan.maxRegistries || 1

    if (ownedRegistries.length >= maxRegistries) {
      trackLimitReached('registries')
      setShowLimitModal(true)
      return
    }

    router.push('/registries/new')
  }

  const handleDeleteRegistry = async () => {
    if (!registryToDelete || !session?.access_token) return

    setIsDeletingRegistry(true)
    try {
      const response = await fetch(`/api/companies/${registryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      router.push('/dashboard/registries?deleted=true')
      await refetchCompanies()
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isEmpty = companies.length === 0
  const profileScore = dashboardMetrics.profileCompleteness

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-6 px-4 flex flex-col items-center justify-center text-center min-h-[20vh]">
        <div className="max-w-4xl mx-auto z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Bienvenue sur{' '}
            <span className="text-[#ffab5a]">MaydAI la plateforme de</span>
            <br />
            <span className="text-[#ffab5a]">conformité AI Act</span>
          </h2>
          <div className="flex justify-center mt-6">
            <Image
              src="/logos/logo-conformite-ia.svg"
              alt="Logo conformité IA européenne"
              width={128}
              height={128}
              className="w-20 md:w-32 opacity-80 pointer-events-none select-none"
              priority
            />
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {successMessage && (
          <div
            role="status"
            className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between mb-8"
          >
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" aria-hidden="true" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className={`text-green-600 hover:text-green-800 transition-colors rounded ${FOCUS_RING}`}
              aria-label="Fermer le message de confirmation"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Votre tableau de bord des registres
          </h1>
          <p className="text-gray-600 max-w-3xl leading-relaxed">
            Ce tableau de bord centralise l&apos;ensemble de vos démarches de conformité. Si vous
            vous connectez pour la première fois, votre espace est vide. Commencez par créer votre
            premier registre pour évaluer vos cas d&apos;usage IA et débloquer toutes les
            fonctionnalités de la plateforme.
          </p>
        </div>

        <section
          aria-label="Indicateurs de votre compte"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-stretch"
        >
          <article
            aria-label={`Complétude du profil : ${profileScore} pour cent`}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">Complétude profil</span>
              <Shield className="text-[#0080A3]" size={20} aria-hidden="true" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{profileScore}%</span>
              <div
                className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={profileScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progression de complétude du profil : ${profileScore} pour cent`}
              >
                <div
                  className="h-full bg-[#0080A3] rounded-full transition-all duration-500"
                  style={{ width: `${profileScore}%` }}
                />
              </div>
              {profileScore < 100 && (
                <button
                  type="button"
                  onClick={() => router.push('/settings?section=general&highlight=profile')}
                  className="relative z-10 w-full text-xs text-[#0080A3] font-medium hover:underline inline-flex items-center justify-center gap-1 mt-3 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#0080A3] rounded py-1"
                >
                  Comment améliorer mon score ?
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </article>

          {METRIC_CARDS.map(({ key, label, icon: Icon, ariaLabel }) => {
            const value = dashboardMetrics[key]
            return (
              <article
                key={key}
                aria-label={ariaLabel(value)}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full"
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-500">{label}</span>
                  <Icon className="text-[#0080A3]" size={20} aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{value}</span>
                </div>
              </article>
            )
          })}
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Mes registres</h2>
          <button
            type="button"
            onClick={handleCreateRegistryClick}
            aria-haspopup="dialog"
            className="inline-flex items-center bg-[#0080A3] hover:bg-[#00607a] text-white px-4 py-2 rounded-md font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3]"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Ajouter un nouveau registre
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {isRefetching && (
            <p className="text-sm text-gray-500 mb-6" role="status">
              Mise à jour de la liste des registres...
            </p>
          )}

          {isEmpty ? (
            <div className="mt-6 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-slate-50">
              <FolderPlus size={48} className="text-gray-400 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Aucun registre pour le moment
              </h3>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Commencez votre mise en conformité AI Act en créant votre premier registre. Il
                centralisera l&apos;évaluation de vos cas d&apos;usage.
              </p>
              <button
                type="button"
                onClick={handleCreateRegistryClick}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2 bg-[#0080A3] hover:bg-[#00607a] text-white px-5 py-2.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0080A3]"
              >
                <Plus size={18} aria-hidden="true" />
                Créer mon premier registre
              </button>
            </div>
          ) : (
            <div className="space-y-8">
            {ownedRegistries.length > 0 && (
              <section aria-labelledby="owned-registries-heading" className="space-y-4">
                <h3 id="owned-registries-heading" className="text-lg font-semibold text-gray-800">
                  Registres dont vous êtes propriétaire
                </h3>
                <div className="grid gap-4">
                  {ownedRegistries.map((company) => (
                    <div key={company.id} className="relative">
                      <Link
                        href={`/dashboard/${company.id}`}
                        className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[#0080A3]/20 border border-transparent transition-all group block ${FOCUS_RING}`}
                      >
                        <div className="flex items-center justify-between pr-12">
                          <div className="flex items-center space-x-4">
                            <div className="bg-[#0080A3]/10 p-3 rounded-lg group-hover:bg-[#0080A3]/20 transition-colors">
                              <Building2 className="h-6 w-6 text-[#0080A3]" aria-hidden="true" />
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

                      <div
                        className="absolute top-4 right-4"
                        ref={openMenuId === company.id ? dropdownRef : null}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === company.id ? null : company.id)
                          }}
                          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${FOCUS_RING}`}
                          aria-label={`Actions pour le registre ${company.name}`}
                          aria-expanded={openMenuId === company.id}
                          aria-haspopup="menu"
                        >
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {openMenuId === company.id && (
                          <div
                            role="menu"
                            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(e) => handleDeleteClick(e, company)}
                              className={`w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors ${FOCUS_RING}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span>Supprimer le registre</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="collaborative-registries-heading" className="space-y-4">
              <h3 id="collaborative-registries-heading" className="text-lg font-semibold text-gray-800">
                Registres collaboratifs
              </h3>
              {collaboratorRegistries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                  <p className="text-gray-600">Vous n&apos;avez accès à aucun registre collaboratif</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {collaboratorRegistries.map((company) => (
                    <Link
                      key={company.id}
                      href={`/dashboard/${company.id}`}
                      className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md hover:border-purple-500/20 border border-transparent transition-all group ${FOCUS_RING}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-purple-50 p-3 rounded-lg group-hover:bg-purple-100 transition-colors">
                            <Building2 className="h-6 w-6 text-purple-600" aria-hidden="true" />
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
                          <ChevronRight
                            className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
          )}
        </div>

        <section
          aria-labelledby="security-reassurance-heading"
          className="mt-16 bg-slate-50 border border-slate-200 rounded-xl p-8 mb-10"
        >
          <h3 id="security-reassurance-heading" className="text-lg font-bold text-gray-900 mb-4">
            Vos données, notre priorité absolue : Sécurité, Souveraineté et Transparence
          </h3>
          <p className="text-gray-600 mb-6">
            Chez MaydAI, nous ne faisons aucun compromis avec la sécurité. Nous avons fait le choix
            stratégique d&apos;une infrastructure souveraine et robuste pour garantir que vos données
            restent protégées, confidentielles et sous juridiction européenne.
          </p>
          <ul className="flex flex-col gap-3 mb-8">
            {SECURITY_BULLETS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="p-2 bg-[#0080A3]/10 rounded-lg shrink-0">
                  <Icon className="h-5 w-5 text-[#0080A3]" aria-hidden="true" />
                </div>
                <span className="text-base text-gray-700 font-medium">{label}</span>
              </li>
            ))}
          </ul>
          <div className="w-full pt-6 border-t border-slate-200">
            <SecurityLogosGrid />
          </div>
        </section>
      </main>

      <Footer />

      <PlanLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentCount={ownedRegistries.length}
        maxLimit={plan.maxRegistries || 1}
        planName={plan.displayName}
        resourceType="registry"
      />

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
