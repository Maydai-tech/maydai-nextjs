import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ComplAIModel } from '@/lib/supabase'
import { Bot, Search, X, ChevronDown } from 'lucide-react'

interface ModelSelectorProps {
  value?: string
  onChange: (modelId: string | null, modelInfo: ComplAIModel | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  placeholder = "Sélectionner un modèle...",
  className = '',
  disabled = false
}) => {
  const [models, setModels] = useState<ComplAIModel[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModel, setSelectedModel] = useState<ComplAIModel | null>(null)

  // Charger les modèles au montage
  useEffect(() => {
    fetchModels()
  }, [])

  // Charger le modèle sélectionné si une valeur est fournie
  useEffect(() => {
    if (value && !selectedModel) {
      fetchSelectedModel(value)
    } else if (!value) {
      setSelectedModel(null)
    }
  }, [value])

  const fetchModels = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('compl_ai_models')
        .select('*')
        .order('model_provider', { ascending: true })
        .order('model_name', { ascending: true })

      if (error) throw error
      setModels(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSelectedModel = async (modelId: string) => {
    try {
      const { data, error } = await supabase
        .from('compl_ai_models')
        .select('*')
        .eq('id', modelId)
        .single()

      if (error) throw error
      setSelectedModel(data)
    } catch (error) {
      console.error('Erreur lors du chargement du modèle sélectionné:', error)
    }
  }

  const filteredModels = models.filter(model => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      model.model_name.toLowerCase().includes(searchLower) ||
      (model.model_provider?.toLowerCase().includes(searchLower) ?? false) ||
      (model.model_type?.toLowerCase().includes(searchLower) ?? false)
    )
  })

  const groupedModels = filteredModels.reduce((acc, model) => {
    const provider = model.model_provider || 'Autres'
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push(model)
    return acc
  }, {} as Record<string, ComplAIModel[]>)

  const handleSelect = (model: ComplAIModel) => {
    setSelectedModel(model)
    onChange(model.id, model)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    setSelectedModel(null)
    onChange(null, null)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Sélecteur principal */}
      <div
        className={`
          relative w-full border border-gray-300 rounded-lg px-3 py-2 text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bot className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {selectedModel ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-gray-900 truncate">
                  {selectedModel.model_name}
                </span>
                {selectedModel.model_provider && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 text-sm truncate">
                      {selectedModel.model_provider}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-gray-500 truncate">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedModel && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Menu déroulant */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Liste des modèles */}
          <div className="max-h-40 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500">
                Chargement des modèles...
              </div>
            ) : Object.keys(groupedModels).length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                Aucun modèle trouvé
              </div>
            ) : (
              Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    {provider}
                  </div>
                  {providerModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      onClick={() => handleSelect(model)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {model.model_name}
                          </div>
                          {model.version && (
                            <div className="text-xs text-gray-500">
                              Version: {model.version}
                            </div>
                          )}
                        </div>
                        {model.model_type && (
                          <div className="text-xs text-gray-400 capitalize">
                            {model.model_type.replace('-', ' ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelSelector