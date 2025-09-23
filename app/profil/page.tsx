'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Mail, LogOut, Settings, X, CreditCard, UserCircle } from 'lucide-react'
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
            {/* Header avec avatar */}
            <div className="flex items-center space-x-6 p-6 bg-blue-50/50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0">
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Informations générales</h2>
                <p className="text-gray-500">Gérez vos informations personnelles et les paramètres de votre compte</p>
              </div>
            </div>

            {/* Carte Email */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <Mail className="w-5 h-5 text-[#0080A3] mr-2" />
                  Adresse e-mail
                </h3>
                <p className="text-gray-500 text-sm">Votre adresse e-mail associée à ce compte</p>
              </div>

              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-900 font-medium">{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        )
      case 'subscription':
        return (
          <div className="space-y-8">
            {/* Header Abonnement */}
            <div className="flex items-center space-x-6 p-6 bg-blue-50/50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0">
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Abonnement</h2>
                <p className="text-gray-500">Gérez votre abonnement et vos paramètres de facturation</p>
              </div>
            </div>

            {/* Carte Plan */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <CreditCard className="w-5 h-5 text-[#0080A3] mr-2" />
                  Plan actuel
                </h3>
                <p className="text-gray-500 text-sm">Informations sur votre plan d'abonnement</p>
              </div>

              <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-900 font-medium">Plan gratuit</span>
                  </div>
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full font-medium">Actif</span>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <NavBar />
      <div className="max-w-6xl mx-auto p-6">
        {/* Header avec design amélioré */}
        <div className="mb-10">
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
    </div>
  );
} 