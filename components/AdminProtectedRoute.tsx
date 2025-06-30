'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { hasAdminRole, type UserRole } from '@/lib/admin-auth'

interface AdminProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'super_admin'
  fallbackUrl?: string
}

export default function AdminProtectedRoute({ 
  children, 
  requiredRole = 'admin',
  fallbackUrl = '/dashboard' 
}: AdminProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!loading && user) {
        try {
          // Récupérer le profil avec le rôle
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (error || !profile) {
            console.error('Erreur lors de la vérification du rôle:', error)
            setIsAdmin(false)
            router.push(fallbackUrl)
          } else {
            const userRole = profile.role as UserRole
            
            // Vérifier si l'utilisateur a le rôle requis
            if (requiredRole === 'super_admin') {
              setIsAdmin(userRole === 'super_admin')
            } else {
              setIsAdmin(hasAdminRole(userRole))
            }
            
            if (!isAdmin && userRole !== requiredRole && !hasAdminRole(userRole)) {
              router.push(fallbackUrl)
            }
          }
        } catch (error) {
          console.error('Erreur lors de la vérification du rôle:', error)
          setIsAdmin(false)
          router.push(fallbackUrl)
        }
      } else if (!loading && !user) {
        // Pas connecté
        router.push('/login')
      }
      setCheckingRole(false)
    }

    checkAdminRole()
  }, [user, loading, router, supabase, requiredRole, fallbackUrl])

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