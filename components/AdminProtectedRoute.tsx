'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!loading && user) {
        try {
          // Vérifier si l'utilisateur a un rôle admin
          const { data, error } = await supabase
            .from('users_roles')
            .select(`
              role_id,
              roles (
                name
              )
            `)
            .eq('user_id', user.id)
            .single()

          if (error) {
            console.error('Erreur lors de la vérification du rôle:', error)
            setIsAdmin(false)
            router.push('/login')
          } else if ((data?.roles as any)?.name === 'admin') {
            setIsAdmin(true)
          } else {
            // Utilisateur connecté mais pas admin
            setIsAdmin(false)
            router.push('/') // Rediriger vers l'accueil
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du rôle:', error)
          setIsAdmin(false)
          router.push('/login')
        }
      } else if (!loading && !user) {
        // Pas connecté
        router.push('/login')
      }
      setCheckingRole(false)
    }

    checkAdminRole()
  }, [user, loading, router])

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Redirection en cours vers login
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl text-gray-400 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0080A3] hover:bg-[#006b8a] text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 