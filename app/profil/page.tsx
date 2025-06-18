'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { User, Mail, LogOut } from 'lucide-react'

export default function ProfilPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil utilisateur</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center mb-6">
          <div className="bg-[#0080A3]/10 p-3 rounded-full mr-4">
            <User className="h-8 w-8 text-[#0080A3]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Informations du compte</h2>
            <p className="text-gray-600">Gérez vos informations personnelles</p>
          </div>
        </div>

        {user && (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700">Adresse e-mail</p>
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700">ID utilisateur</p>
                <p className="text-gray-900 text-sm font-mono">{user.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Déconnexion</h3>
            <p className="text-gray-600">
              Déconnectez-vous de votre compte en toute sécurité
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
} 