'use client'

import { useEffect, useState } from 'react'
import { supabase, QuestionnaireQuestion, QuestionnaireSection } from '@/lib/supabase'
import { Plus, Edit, Trash2, Save, X, Minus, Eye } from 'lucide-react'

interface Option {
  value: string
  label: string
  next_question_id?: string
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [sections, setSections] = useState<QuestionnaireSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFlowVisualization, setShowFlowVisualization] = useState(false)
  const [options, setOptions] = useState<Option[]>([])
  const [editOptions, setEditOptions] = useState<Option[]>([])
  const [formData, setFormData] = useState({
    section_id: '',
    code: '',
    question_text: '',
    question_type: 'text' as 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number' | 'date',
    next_question_id: '',
    is_required: false,
    display_order: 0,
    help_text: '',
    is_active: true
  })
  const [editFormData, setEditFormData] = useState({
    section_id: '',
    code: '',
    question_text: '',
    question_type: 'text' as 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number' | 'date',
    next_question_id: '',
    is_required: false,
    display_order: 0,
    help_text: '',
    is_active: true
  })

  useEffect(() => {
    fetchQuestions()
    fetchSections()
  }, [])

  async function fetchQuestions() {
    try {
      const { data, error } = await supabase
        .from('questionnaire_questions')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error)
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  async function handleCreate() {
    try {
      let processedOptions = null
      if (options.length > 0) {
        // Nettoyer les options : si le label est vide, utiliser la valeur comme label
        const cleanedOptions = options.map(opt => ({
          value: opt.value,
          label: opt.label.trim() || opt.value,
          next_question_id: opt.next_question_id || undefined
        }))
        
        // Si toutes les options ont la même valeur et label après nettoyage ET aucune question suivante, utiliser le format simple
        const allSimple = cleanedOptions.every(opt => 
          opt.value === opt.label && !opt.next_question_id
        )
        if (allSimple) {
          processedOptions = cleanedOptions.map(opt => opt.value)
        } else {
          processedOptions = cleanedOptions.map(opt => ({ 
            value: opt.value, 
            label: opt.label,
            ...(opt.next_question_id && { next_question_id: opt.next_question_id })
          }))
        }
      }

      const questionData = {
        ...formData,
        section_id: formData.section_id || null,
        next_question_id: formData.next_question_id || null,
        options: processedOptions
      }

      const { error } = await supabase
        .from('questionnaire_questions')
        .insert([questionData])

      if (error) throw error
      
      setShowCreateForm(false)
      resetForm()
      fetchQuestions()
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    }
  }

  async function handleUpdate() {
    if (!editingQuestion) return

    try {
      let processedOptions = null
      if (editOptions.length > 0) {
        // Nettoyer les options : si le label est vide, utiliser la valeur comme label
        const cleanedOptions = editOptions.map(opt => ({
          value: opt.value,
          label: opt.label.trim() || opt.value,
          next_question_id: opt.next_question_id || undefined
        }))
        
        // Si toutes les options ont la même valeur et label après nettoyage ET aucune question suivante, utiliser le format simple
        const allSimple = cleanedOptions.every(opt => 
          opt.value === opt.label && !opt.next_question_id
        )
        if (allSimple) {
          processedOptions = cleanedOptions.map(opt => opt.value)
        } else {
          processedOptions = cleanedOptions.map(opt => ({ 
            value: opt.value, 
            label: opt.label,
            ...(opt.next_question_id && { next_question_id: opt.next_question_id })
          }))
        }
      }

      const questionData = {
        ...editFormData,
        section_id: editFormData.section_id || null,
        next_question_id: editFormData.next_question_id || null,
        options: processedOptions
      }

      const { error } = await supabase
        .from('questionnaire_questions')
        .update(questionData)
        .eq('id', editingQuestion)

      if (error) throw error
      
      setEditingQuestion(null)
      resetEditForm()
      fetchQuestions()
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return

    try {
      const { error } = await supabase
        .from('questionnaire_questions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchQuestions()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  function resetForm() {
    setFormData({
      section_id: '',
      code: '',
      question_text: '',
      question_type: 'text',
      next_question_id: '',
      is_required: false,
      display_order: 0,
      help_text: '',
      is_active: true
    })
    setOptions([])
  }

  function resetEditForm() {
    setEditFormData({
      section_id: '',
      code: '',
      question_text: '',
      question_type: 'text',
      next_question_id: '',
      is_required: false,
      display_order: 0,
      help_text: '',
      is_active: true
    })
    setEditOptions([])
  }

  function startEditing(question: QuestionnaireQuestion) {
    setEditFormData({
      section_id: question.section_id || '',
      code: question.code || '',
      question_text: question.question_text || '',
      question_type: question.question_type,
      next_question_id: question.next_question_id || '',
      is_required: question.is_required || false,
      display_order: question.display_order || 0,
      help_text: question.help_text || '',
      is_active: question.is_active
    })

    // Charger les options existantes
    if (question.options && Array.isArray(question.options)) {
      if (question.options.length > 0 && typeof question.options[0] === 'string') {
        // Format simple : ["option1", "option2"]
        setEditOptions((question.options as string[]).map(opt => ({ 
          value: opt, 
          label: opt,
          next_question_id: undefined
        })))
      } else {
        // Format objet : [{ value: "val", label: "label", next_question_id?: "id" }]
        setEditOptions(question.options.map(opt => {
          if (typeof opt === 'object' && opt !== null) {
            return { 
              value: opt.value || '', 
              label: opt.label || opt.value || '',
              next_question_id: opt.next_question_id || undefined
            }
          }
          return { 
            value: String(opt), 
            label: String(opt),
            next_question_id: undefined
          }
        }))
      }
    } else {
      setEditOptions([])
    }

    setEditingQuestion(question.id)
  }

  function addOption() {
    setOptions([...options, { value: '', label: '', next_question_id: undefined }])
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, field: 'value' | 'label' | 'next_question_id', value: string) {
    const newOptions = [...options]
    if (field === 'next_question_id') {
      newOptions[index][field] = value || undefined
    } else {
      newOptions[index][field] = value
    }
    setOptions(newOptions)
  }

  function addEditOption() {
    setEditOptions([...editOptions, { value: '', label: '', next_question_id: undefined }])
  }

  function removeEditOption(index: number) {
    setEditOptions(editOptions.filter((_, i) => i !== index))
  }

  function updateEditOption(index: number, field: 'value' | 'label' | 'next_question_id', value: string) {
    const newOptions = [...editOptions]
    if (field === 'next_question_id') {
      newOptions[index][field] = value || undefined
    } else {
      newOptions[index][field] = value
    }
    setEditOptions(newOptions)
  }

  function getSectionName(sectionId: string | undefined) {
    if (!sectionId) return 'Sans section'
    const section = sections.find(s => s.id === sectionId)
    return section ? section.name : 'Section inconnue'
  }

  const questionTypeLabels = {
    text: 'Texte court',
    textarea: 'Texte long',
    select: 'Liste déroulante / Choix unique',
    multiselect: 'Sélection multiple',
    boolean: 'Oui/Non',
    number: 'Nombre',
    date: 'Date'
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
          <h1 className="text-2xl font-bold text-gray-900">Questions du questionnaire</h1>
          <p className="mt-2 text-gray-600">
            Gérez les questions de votre questionnaire de conformité IA Act. 
            Chaque question doit définir sa question suivante pour créer un parcours personnalisé.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFlowVisualization(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualiser le flux
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle question
          </button>
        </div>
      </div>

      {/* Formulaire d'édition */}
      {editingQuestion && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Modifier la question</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={editFormData.section_id}
                onChange={(e) => setEditFormData({ ...editFormData, section_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              >
                <option value="">Sans section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                placeholder="ex: ai_system_purpose"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Texte de la question</label>
            <textarea
              value={editFormData.question_text}
              onChange={(e) => setEditFormData({ ...editFormData, question_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              rows={3}
              placeholder="Quel est l'objectif principal de votre système d'IA ?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de question</label>
              <select
                value={editFormData.question_type}
                onChange={(e) => setEditFormData({ ...editFormData, question_type: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              >
                {Object.entries(questionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordre d'affichage</label>
              <input
                type="number"
                value={editFormData.display_order}
                onChange={(e) => setEditFormData({ ...editFormData, display_order: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question suivante par défaut
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={editFormData.next_question_id}
              onChange={(e) => setEditFormData({ ...editFormData, next_question_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              required
            >
              <option value="">Fin du questionnaire</option>
              {questions
                .filter(q => q.id !== editingQuestion) // Éviter la boucle infinie
                .map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.code ? `${question.code} - ${question.question_text}` : question.question_text}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Cette question sera affichée après celle-ci, sauf si une option spécifique override ce choix.
            </p>
          </div>

          {(editFormData.question_type === 'select' || editFormData.question_type === 'multiselect') && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <button
                  type="button"
                  onClick={addEditOption}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une option
                </button>
              </div>
              
              {editOptions.length === 0 && (
                <p className="text-gray-500 text-sm italic mb-2">
                  Aucune option ajoutée. Cliquez sur "Ajouter une option" pour commencer.
                </p>
              )}
              
              {editOptions.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valeur</label>
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateEditOption(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors text-sm"
                        placeholder="Valeur de l'option"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Texte affiché</label>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateEditOption(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors text-sm"
                        placeholder="Texte affiché (optionnel)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Question suivante</label>
                      <select
                        value={option.next_question_id || ''}
                        onChange={(e) => updateEditOption(index, 'next_question_id', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                      >
                        <option value="">Utiliser la question par défaut</option>
                        {questions
                          .filter(q => q.id !== editingQuestion) // Éviter la boucle infinie
                          .map((question) => (
                            <option key={question.id} value={question.id}>
                              {question.code ? `${question.code} - ${question.question_text}` : question.question_text}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeEditOption(index)}
                      className="text-red-600 hover:text-red-800 p-1 text-sm flex items-center"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              
              {editOptions.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 bg-blue-50 p-3 rounded-md">
                  <p className="mb-1">
                    <strong>Texte affiché :</strong> Si vous laissez le "Texte affiché" vide, la valeur sera utilisée comme texte d'affichage.
                  </p>
                  <p>
                    <strong>Question suivante :</strong> Override la question suivante par défaut pour cette réponse spécifique. Si aucune n'est sélectionnée, utilise la question par défaut de la question.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Texte d'aide (optionnel)</label>
            <textarea
              value={editFormData.help_text}
              onChange={(e) => setEditFormData({ ...editFormData, help_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              rows={2}
              placeholder="Texte d'aide pour guider l'utilisateur"
            />
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_required_edit"
                checked={editFormData.is_required}
                onChange={(e) => setEditFormData({ ...editFormData, is_required: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_required_edit" className="text-sm text-gray-700">Obligatoire</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active_edit"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active_edit" className="text-sm text-gray-700">Active</label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setEditingQuestion(null)
                resetEditForm()
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Annuler
            </button>
            <button
              onClick={handleUpdate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-medium mb-4">Créer une nouvelle question</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              >
                <option value="">Sans section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                placeholder="ex: ai_system_purpose"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Texte de la question</label>
            <textarea
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              rows={3}
              placeholder="Quel est l'objectif principal de votre système d'IA ?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de question</label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              >
                {Object.entries(questionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ordre d'affichage</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question suivante par défaut
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={formData.next_question_id}
              onChange={(e) => setFormData({ ...formData, next_question_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              required
            >
              <option value="">Fin du questionnaire</option>
              {questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.code ? `${question.code} - ${question.question_text}` : question.question_text}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Cette question sera affichée après celle-ci, sauf si une option spécifique override ce choix.
            </p>
          </div>

          {(formData.question_type === 'select' || formData.question_type === 'multiselect') && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une option
                </button>
              </div>
              
              {options.length === 0 && (
                <p className="text-gray-500 text-sm italic mb-2">
                  Aucune option ajoutée. Cliquez sur "Ajouter une option" pour commencer.
                </p>
              )}
              
              {options.map((option, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valeur</label>
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateOption(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors text-sm"
                        placeholder="Valeur de l'option"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Texte affiché</label>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors text-sm"
                        placeholder="Texte affiché (optionnel)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Question suivante</label>
                      <select
                        value={option.next_question_id || ''}
                        onChange={(e) => updateOption(index, 'next_question_id', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                      >
                        <option value="">Utiliser la question par défaut</option>
                        {questions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {question.code ? `${question.code} - ${question.question_text}` : question.question_text}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-800 p-1 text-sm flex items-center"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              
              {options.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 bg-blue-50 p-3 rounded-md">
                  <p className="mb-1">
                    <strong>Texte affiché :</strong> Si vous laissez le "Texte affiché" vide, la valeur sera utilisée comme texte d'affichage.
                  </p>
                  <p>
                    <strong>Question suivante :</strong> Override la question suivante par défaut pour cette réponse spécifique. Si aucune n'est sélectionnée, utilise la question par défaut de la question.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Texte d'aide (optionnel)</label>
            <textarea
              value={formData.help_text}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
              rows={2}
              placeholder="Texte d'aide pour guider l'utilisateur"
            />
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_required" className="text-sm text-gray-700">Obligatoire</label>
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

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowCreateForm(false)
                resetForm()
              }}
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

      {/* Guide rapide pour les questions conditionnelles */}
      {questions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            💡 Guide rapide : Flux de questions
          </h3>
          <p className="text-sm text-blue-700 mb-2">
            Chaque question doit définir sa question suivante. Vous pouvez créer des parcours complexes avec des conditions.
          </p>
          <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
            <li><strong>Question suivante par défaut :</strong> Définit où aller après cette question</li>
            <li><strong>Options avec override :</strong> Permettent de rediriger selon la réponse (questions à choix multiple)</li>
            <li><strong>Fin du questionnaire :</strong> Sélectionnez "Fin du questionnaire" pour terminer le parcours</li>
            <li>Utilisez le bouton "Visualiser le flux" pour voir le parcours complet</li>
          </ul>
        </div>
      )}

      {/* Liste des questions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Logique
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requis
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
            {questions.map((question) => {
              // Vérifier si la question a une logique conditionnelle
              const hasOptionOverrides = question.options && 
                Array.isArray(question.options) &&
                question.options.some(opt => 
                  typeof opt === 'object' && opt !== null && opt.next_question_id
                )

              const hasCustomFlow = question.next_question_id !== null && question.next_question_id !== undefined

              return (
                <tr key={question.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {question.code}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {question.question_text}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getSectionName(question.section_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {questionTypeLabels[question.question_type]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hasOptionOverrides ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Conditionnelle
                      </span>
                    ) : hasCustomFlow ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Dirigée
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Fin
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      question.is_required 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {question.is_required ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      question.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {question.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        const questionToEdit = questions.find(q => q.id === question.id)
                        if (questionToEdit) startEditing(questionToEdit)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de visualisation du flux */}
      {showFlowVisualization && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Visualisation du flux de questions
              </h3>
              <button
                onClick={() => setShowFlowVisualization(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {questions
                .filter(q => q.is_active)
                .sort((a, b) => a.display_order - b.display_order)
                .map((question, index) => {
                  const hasConditionalLogic = question.options && 
                    Array.isArray(question.options) &&
                    question.options.some(opt => 
                      typeof opt === 'object' && opt !== null && opt.next_question_id
                    )

                  return (
                    <div key={question.id} className="mb-6 p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {question.code && `${question.code} - `}{question.question_text}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Type: {questionTypeLabels[question.question_type]}
                            {question.section_id && ` | Section: ${getSectionName(question.section_id)}`}
                          </p>
                        </div>
                        {hasConditionalLogic && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Logique conditionnelle
                          </span>
                        )}
                      </div>

                      {/* Question suivante par défaut */}
                      <div className="ml-9 mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Question suivante par défaut :</h5>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mx-2">→</span>
                          <span className={question.next_question_id ? "text-blue-600" : "text-gray-500"}>
                            {question.next_question_id ? 
                              (() => {
                                const nextQuestion = questions.find(q => q.id === question.next_question_id)
                                return nextQuestion ? 
                                  `${nextQuestion.code ? nextQuestion.code + ' - ' : ''}${nextQuestion.question_text}` :
                                  "Question introuvable"
                              })() :
                              "Fin du questionnaire"
                            }
                          </span>
                        </div>
                      </div>

                      {hasConditionalLogic && question.options && Array.isArray(question.options) && (
                        <div className="ml-9">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Overrides par option :</h5>
                          {question.options.map((option, optIndex) => {
                            if (typeof option === 'object' && option !== null) {
                              const nextQuestion = option.next_question_id ? 
                                questions.find(q => q.id === option.next_question_id) : null

                              return (
                                <div key={optIndex} className="flex items-center text-sm text-gray-600 mb-1">
                                  <span className="bg-gray-100 px-2 py-1 rounded mr-2 font-mono">
                                    {option.label || option.value}
                                  </span>
                                  <span className="mx-2">→</span>
                                  <span className={nextQuestion ? "text-blue-600" : "text-gray-500"}>
                                    {nextQuestion ? 
                                      `${nextQuestion.code ? nextQuestion.code + ' - ' : ''}${nextQuestion.question_text}` :
                                      "Utilise la question par défaut"
                                    }
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              
              {questions.filter(q => q.is_active).length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Aucune question active trouvée.
                </p>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFlowVisualization(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 