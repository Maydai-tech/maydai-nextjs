import React, { useState, useEffect } from 'react'
import { ComplAIModel } from '@/lib/supabase'
import { useApiCall } from '@/lib/api-auth'
import { Bot, X, Search, Check } from 'lucide-react'
import ComplAiScoreBadge from './ComplAiScoreBadge'

type PartialComplAIModel = Pick<ComplAIModel, 'id' | 'model_name' | 'model_provider'> & Partial<Pick<ComplAIModel, 'model_type' | 'version' | 'created_at' | 'updated_at'>>

interface ModelProvider {
  id: number
  name: string
}

interface ModelSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentModel?: PartialComplAIModel | null
  onSave: (model: PartialComplAIModel | null) => Promise<void>
  saving?: boolean
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onSave,
  saving = false
}) => {
  const [selectedModel, setSelectedModel] = useState<PartialComplAIModel | null>(currentModel || null)
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [providerModels, setProviderModels] = useState<Record<number, ComplAIModel[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState<Record<number, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const api = useApiCall()

  // Reset selected model when modal opens/closes or current model changes
  useEffect(() => {
    if (isOpen) {
      setSelectedModel(currentModel || null)
      fetchProviders()
    }
  }, [isOpen, currentModel])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/model-providers')
      const providersData = response.data || []
      setProviders(providersData)
      
      // Fetch models for each provider
      for (const provider of providersData) {
        await fetchModelsForProvider(provider.id)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchModelsForProvider = async (providerId: number) => {
    try {
      setLoadingModels(prev => ({ ...prev, [providerId]: true }))
      const response = await api.get(`/api/model-providers/${providerId}/models`)
      setProviderModels(prev => ({
        ...prev,
        [providerId]: response.data || []
      }))
    } catch (error) {
      console.error(`Erreur lors du chargement des modèles pour le fournisseur ${providerId}:`, error)
      setProviderModels(prev => ({
        ...prev,
        [providerId]: []
      }))
    } finally {
      setLoadingModels(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const getFilteredProvidersAndModels = () => {
    return providers.map(provider => {
      const models = providerModels[provider.id] || []
      
      // Filter models based on search term
      const filteredModels = models.filter(model => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
          model.model_name.toLowerCase().includes(searchLower) ||
          provider.name.toLowerCase().includes(searchLower) ||
          (model.model_type?.toLowerCase().includes(searchLower) ?? false)
        )
      })
      
      return {
        provider,
        models: filteredModels,
        isLoading: loadingModels[provider.id] || false
      }
    }).filter(({ models, isLoading }) => models.length > 0 || isLoading)
  }

  const handleSave = async () => {
    try {
      await onSave(selectedModel)
      onClose()
    } catch (error) {
      console.error('Error saving model:', error)
    }
  }

  const handleCancel = () => {
    setSelectedModel(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm z-[100] transition-all"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] transform transition-all pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Sélectionner un modèle
                </h2>
                <p className="text-sm text-gray-600">
                  Sélectionnez le modèle utilisé par votre cas d'usage
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Models List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Chargement des fournisseurs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredProvidersAndModels().map(({ provider, models, isLoading }) => (
                  <div key={provider.id}>
                    {/* Provider Header */}
                    <div className="px-3 py-2 text-sm font-semibold text-gray-600 uppercase bg-gray-50 rounded-lg mb-2">
                      {provider.name}
                    </div>
                    
                    {/* Models Cards */}
                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Chargement des modèles...</p>
                        </div>
                      ) : (
                        models.map((model) => (
                          <label 
                            key={model.id} 
                            className={`group flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedModel?.id === model.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className="flex items-start space-x-4">
                              <div className="flex items-center h-6 mt-1">
                                <input
                                  type="radio"
                                  name="selectedModel"
                                  value={model.id}
                                  checked={selectedModel?.id === model.id}
                                  onChange={() => setSelectedModel(model)}
                                  className="h-4 w-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Bot className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {model.model_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>{provider.name}</span>
                                  {model.version && (
                                    <>
                                      <span>•</span>
                                      <span>v{model.version}</span>
                                    </>
                                  )}
                                  {model.model_type && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{model.model_type.replace('-', ' ')}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                
                {!loading && getFilteredProvidersAndModels().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun modèle trouvé
                  </div>
                )}
              </div>
            )}

            {/* Selected Model Preview */}
            {selectedModel && selectedModel.id !== currentModel?.id && (() => {
              // Find the provider for the selected model
              const selectedProvider = providers.find(provider => 
                providerModels[provider.id]?.some(model => model.id === selectedModel.id)
              )
              return (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Nouveau modèle sélectionné :</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{selectedModel.model_name}</span>
                      {selectedProvider && (
                        <span className="text-blue-700">• {selectedProvider.name}</span>
                      )}
                      {selectedModel.version && (
                        <span className="text-blue-600 text-sm">(v{selectedModel.version})</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sauvegarde et recalcul...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Sauvegarder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ModelSelectorModal