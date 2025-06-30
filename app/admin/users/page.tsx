'use client'

import { useEffect, useState } from 'react'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import { createBrowserClient } from '@supabase/ssr'
import { getAdminUsers, promoteToAdmin, demoteAdmin, type AdminProfile } from '@/lib/admin-auth'
import { Shield, ShieldCheck, User, Mail } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadAdminUsers()
  }, [])

  const loadAdminUsers = async () => {
    setLoading(true)
    const adminUsers = await getAdminUsers(supabase)
    setUsers(adminUsers)
    setLoading(false)
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'super_admin' | 'user') => {
    setUpdating(userId)
    
    try {
      if (newRole === 'user') {
        const result = await demoteAdmin(supabase, userId)
        if (!result.success) {
          alert(`Erreur: ${result.error}`)
          return
        }
      } else {
        const result = await promoteToAdmin(supabase, userId, newRole)
        if (!result.success) {
          alert(`Erreur: ${result.error}`)
          return
        }
      }
      
      // Recharger la liste
      await loadAdminUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Erreur lors de la mise à jour du rôle')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <AdminProtectedRoute requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Gestion des Administrateurs
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gérez les rôles et permissions des utilisateurs administrateurs
              </p>
            </div>

            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'super_admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'super_admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                            disabled={updating === user.id}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:opacity-50"
                          >
                            <option value="user">Utilisateur Normal</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Aucun administrateur trouvé</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              Instructions pour ajouter un premier admin
            </h3>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Connectez-vous à votre dashboard Supabase</li>
              <li>Allez dans l&apos;éditeur SQL</li>
              <li>Exécutez : <code className="bg-yellow-100 px-1 rounded">UPDATE profiles SET role = &apos;super_admin&apos; WHERE email = &apos;votre@email.com&apos;;</code></li>
              <li>Rafraîchissez cette page</li>
            </ol>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}