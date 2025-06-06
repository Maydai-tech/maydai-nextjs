'use client'

import { useEffect, useState } from 'react'
import { supabase, QuestionnaireSection } from '@/lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

export default function SectionsPage() {
  const [sections, setSections] = useState<QuestionnaireSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    display_order: 0,
    is_active: true
  })

  useEffect(() => {
    fetchSections()
  }, [])

  async function fetchSections() {
    try {
      const { data, error } = await supabase
        .from('questionnaire_sections')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setSections(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des sections:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const { error } = await supabase
        .from('questionnaire_sections')
        .insert([formData])

      if (error) throw error
      
      setShowCreateForm(false)
      setFormData({ code: '', name: '', description: '', display_order: 0, is_active: true })
      fetchSections()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    }
  }

  async function handleUpdate(id: string, updatedData: Partial<QuestionnaireSection>) {
    try {
      const { error } = await supabase
        .from('questionnaire_sections')
        .update(updatedData)
        .eq('id', id)

      if (error) throw error
      
      setEditingSection(null)
      fetchSections()
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return

    try {
      const { error } = await supabase
        .from('questionnaire_sections')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchSections()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sections du questionnaire</h1>
          <p className="mt-2 text-gray-600">
            Gérez les sections qui organisent votre questionnaire de conformité IA Act
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle section
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Créer une nouvelle section</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                placeholder="ex: general_info"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                placeholder="ex: Informations générales"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              rows={3}
              placeholder="Description de la section"
            />
          </div>
          <div className="flex items-center mt-4 space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordre d'affichage</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Annuler
            </button>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Liste des sections */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ordre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sections.map((section) => (
              <tr key={section.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {section.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {section.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {section.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {section.display_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    section.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {section.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setEditingSection(section.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 