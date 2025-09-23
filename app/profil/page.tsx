'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { User, Mail, LogOut, Settings, X, CreditCard } from 'lucide-react'
import NavBar from '@/components/NavBar/NavBar'

type MenuSection = 'general' | 'subscription' | 'logout'

export default function ProfilPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeSection, setActiveSection] = useState<MenuSection>('general')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
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
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations générales</h2>
              <p className="text-gray-500 text-sm">Gérez vos informations personnelles et les paramètres de votre compte.</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Adresse e-mail</h3>
                <p className="text-gray-500 text-sm">Votre adresse e-mail associée à ce compte.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        )
      case 'subscription':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Abonnement</h2>
              <p className="text-gray-500 text-sm">Gérez votre abonnement et vos paramètres de facturation.</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Plan actuel</h3>
                <p className="text-gray-500 text-sm">Informations sur votre plan d'abonnement.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">Plan gratuit</span>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Paramètres du compte</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Menu latéral */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id && item.id !== 'logout'

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors duration-200 rounded-md hover:bg-gray-50"
                  >
                    <Icon className={`w-4 h-4 ${
                      item.id === 'logout'
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`} />
                    <span className={`text-sm transition-colors duration-200 ${
                      isActive
                        ? 'text-gray-900 font-medium'
                        : item.id === 'logout'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>{item.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Contenu principal */}
          <div className="lg:col-span-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Modal de déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmer la déconnexion</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 