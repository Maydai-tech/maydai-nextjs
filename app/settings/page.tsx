'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { LogOut, Settings, X, CreditCard, ArrowLeft, Users } from 'lucide-react'
import NavBar from '@/components/NavBar/NavBar'
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal'
import ConfirmRemoveCollaboratorModal from '@/components/Collaboration/ConfirmRemoveCollaboratorModal'
import GeneralSection from '@/components/Settings/GeneralSection'
import CollaborationSection from '@/components/Settings/CollaborationSection'
import SubscriptionSection from '@/components/Settings/SubscriptionSection'

type MenuSection = 'general' | 'collaboration' | 'subscription' | 'logout'

export default function ProfilPage() {
  const { user, loading, signOut, getAccessToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState<MenuSection>('general')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<any | null>(null)
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loadingCollaborators, setLoadingCollaborators] = useState(false)

  // Define functions before useEffect hooks to avoid hoisting issues
  const fetchCollaborators = async () => {
    if (!user) return

    setLoadingCollaborators(true)
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }
      const response = await fetch('/api/collaboration/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators')
      }

      const data = await response.json()
      setCollaborators(data)
    } catch (error) {
      console.error('Error fetching collaborators:', error)
    } finally {
      setLoadingCollaborators(false)
    }
  }

  const handleInviteCollaborator = async (data: {
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    if (!user) return

    const token = getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }

    const response = await fetch('/api/collaboration/profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to invite collaborator')
    }

    // Refresh the collaborators list
    await fetchCollaborators()
  }

  const handleRemoveCollaboratorClick = (collaboratorId: string) => {
    const collaborator = collaborators.find(c => c.id === collaboratorId)
    if (collaborator) {
      setSelectedCollaborator(collaborator)
      setShowRemoveModal(true)
    }
  }

  const handleConfirmRemoveCollaborator = async () => {
    if (!user || !selectedCollaborator) return

    const token = getAccessToken()
    if (!token) {
      throw new Error('No access token available')
    }
    const response = await fetch(`/api/collaboration/profile/${selectedCollaborator.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to remove collaborator')
    }

    // Refresh the collaborators list
    await fetchCollaborators()
    setShowRemoveModal(false)
    setSelectedCollaborator(null)
  }

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Read section parameter from URL and set active section
  useEffect(() => {
    if (!mounted) return

    const section = searchParams.get('section')
    if (section) {
      const validSections: MenuSection[] = ['general', 'collaboration', 'subscription']
      if (validSections.includes(section as MenuSection)) {
        setActiveSection(section as MenuSection)

        // Load collaborators if section is collaboration
        if (section === 'collaboration') {
          fetchCollaborators()
        }
      }
    }
  }, [mounted, searchParams])

  // Vérifier le succès du paiement
  useEffect(() => {
    if (mounted && searchParams.get('payment_success') === 'true') {
      setActiveSection('subscription')
      setShowSuccessPopup(true)

      // Nettoyer l'URL après 100ms
      const timer = setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('payment_success')
        url.searchParams.delete('session_id')
        window.history.replaceState({}, '', url.toString())
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [mounted, searchParams])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const menuItems = [
    {
      id: 'general' as MenuSection,
      name: 'Général',
      icon: Settings
    },
    {
      id: 'collaboration' as MenuSection,
      name: 'Collaboration',
      icon: Users
    },
    {
      id: 'subscription' as MenuSection,
      name: 'Abonnement',
      icon: CreditCard
    },
    {
      id: 'logout' as MenuSection,
      name: 'Déconnexion',
      icon: LogOut
    }
  ]

  const handleMenuClick = (sectionId: MenuSection) => {
    if (sectionId === 'logout') {
      setShowLogoutModal(true)
    } else {
      setActiveSection(sectionId)

      // Update URL with section parameter
      const url = new URL(window.location.href)
      url.searchParams.set('section', sectionId)
      window.history.pushState({}, '', url.toString())

      if (sectionId === 'collaboration') {
        fetchCollaborators()
      }
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSection userEmail={user.email} />
      case 'collaboration':
        return (
          <CollaborationSection
            collaborators={collaborators}
            loadingCollaborators={loadingCollaborators}
            onInvite={() => setShowInviteModal(true)}
            onRemove={handleRemoveCollaboratorClick}
          />
        )
      case 'subscription':
        return (
          <SubscriptionSection
            showSuccessPopup={showSuccessPopup}
            onCloseSuccessPopup={() => setShowSuccessPopup(false)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <NavBar />
      <div className="max-w-6xl mx-auto p-6">
        {/* Header avec design amélioré */}
        <div className="mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-[-2px] transition-transform duration-200" />
            <span className="text-sm font-medium">Retour</span>
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Paramètres du compte
          </h1>
          <p className="text-gray-600">Gérez vos préférences et informations personnelles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Menu latéral avec design amélioré */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl p-4 shadow-sm">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id && item.id !== 'logout'

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 rounded-lg group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0080A3]/10 to-blue-50 border border-[#0080A3]/20'
                          : 'hover:bg-gray-50 hover:scale-[1.02]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 transition-colors duration-200 ${
                        isActive
                          ? 'text-[#0080A3]'
                          : item.id === 'logout'
                          ? 'text-red-500 group-hover:text-red-600'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`} />
                      <span className={`text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'text-[#0080A3]'
                          : item.id === 'logout'
                          ? 'text-red-500 group-hover:text-red-600'
                          : 'text-gray-600 group-hover:text-gray-900'
                      }`}>{item.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modal de déconnexion avec design amélioré */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-200 scale-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirmer la déconnexion</h3>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte ? Vous devrez vous reconnecter pour accéder à vos données.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02]"
              >
                Annuler
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Collaborator Modal */}
      <InviteCollaboratorModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteCollaborator}
        scope="company"
      />

      {/* Confirm Remove Collaborator Modal */}
      <ConfirmRemoveCollaboratorModal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false)
          setSelectedCollaborator(null)
        }}
        onConfirm={handleConfirmRemoveCollaborator}
        collaborator={selectedCollaborator}
      />

    </div>
  );
} 