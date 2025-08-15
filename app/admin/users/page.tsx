'use client'

import { useEffect, useState } from 'react'
import AdminProtectedRoute from '@/components/AdminProtectedRoute'
import { Shield, ShieldCheck, User, Mail, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { FullUserProfile, UsersListResponse } from '@/types/admin-users'
import { useAuth } from '@/lib/auth'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<FullUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([])
  const [companyFilter, setCompanyFilter] = useState<string>('')
  
  const { user, session, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && session) {
      loadUsers()
      loadCompanies()
    }
  }, [currentPage, searchTerm, roleFilter, companyFilter, authLoading, session])

  const loadCompanies = async () => {
    if (!session) return
    
    try {
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const loadUsers = async () => {
    if (!session) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter) params.append('role', roleFilter)
      if (companyFilter) params.append('company', companyFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('API Response status:', response.status)
      console.log('API Response headers:', response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          throw new Error(`API Error: ${errorData.error} (${response.status})`)
        } catch {
          throw new Error(`API Error: ${response.status} - ${errorText}`)
        }
      }

      const data: UsersListResponse = await response.json()
      console.log('API Response data:', data)
      
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalUsers(data.pagination.total)
    } catch (error) {
      console.error('Error loading users:', error)
      alert(`Erreur lors du chargement des utilisateurs: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'super_admin' | 'user') => {
    if (!session) {
      alert('Session expirée. Veuillez vous reconnecter.')
      return
    }
    
    setUpdating(userId)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
        return
      }

      // Recharger la liste
      await loadUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Erreur lors de la mise à jour du rôle')
    } finally {
      setUpdating(null)
    }
  }

  const handleCompanyChange = async (userId: string, companyId: string | null) => {
    if (!session) {
      alert('Session expirée. Veuillez vous reconnecter.')
      return
    }
    
    setUpdating(userId)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ company_id: companyId || null })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
        return
      }

      await loadUsers()
    } catch (error) {
      console.error('Error updating company:', error)
      alert('Erreur lors de la mise à jour de l\'entreprise')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Jamais'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AdminProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-8 h-8 text-primary" />
                Gestion des Utilisateurs
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gérez tous les utilisateurs de l'application
              </p>
            </div>

            {/* Filtres */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechercher
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                      placeholder="Email, nom..."
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Tous les rôles</option>
                    <option value="user">Utilisateur</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entreprise
                  </label>
                  <select
                    value={companyFilter}
                    onChange={(e) => {
                      setCompanyFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Toutes les entreprises</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    {totalUsers} utilisateur{totalUsers > 1 ? 's' : ''} trouvé{totalUsers > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {(loading || authLoading) ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inscrit le
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dernière connexion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {userItem.first_name && userItem.last_name 
                                  ? `${userItem.first_name} ${userItem.last_name}`
                                  : userItem.first_name || userItem.last_name || 'Sans nom'}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {userItem.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {userItem.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={userItem.company?.id || ''}
                            onChange={(e) => handleCompanyChange(userItem.id, e.target.value || null)}
                            disabled={updating === userItem.id}
                            className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary disabled:opacity-50"
                          >
                            <option value="">Sans entreprise</option>
                            {companies.map(company => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.role === 'super_admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : userItem.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userItem.role === 'super_admin' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : userItem.role === 'admin' ? (
                              <Shield className="w-3 h-3 mr-1" />
                            ) : null}
                            {userItem.role === 'super_admin' ? 'Super Admin' : 
                             userItem.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(userItem.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(userItem.last_sign_in_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <select
                            value={userItem.role}
                            onChange={(e) => handleRoleChange(userItem.id, e.target.value as any)}
                            disabled={updating === userItem.id || userItem.id === user?.id}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:opacity-50"
                          >
                            <option value="user">Utilisateur</option>
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
                    <p className="text-gray-500">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Affichage de {(currentPage - 1) * 20 + 1} à {Math.min(currentPage * 20, totalUsers)} sur {totalUsers}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  )
}