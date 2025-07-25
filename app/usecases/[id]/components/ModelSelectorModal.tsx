import React, { useState, useEffect } from 'react'
import { ComplAIModel } from '@/lib/supabase'
import { Bot, X, Search, Check } from 'lucide-react'
import ModelSelector from './ModelSelector'
import ComplAiScoreBadge from './ComplAiScoreBadge'

interface ModelSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  currentModel?: ComplAIModel | null
  onSave: (model: ComplAIModel | null) => Promise<void>
  saving?: boolean
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onSave,
  saving = false
}) => {
  const [selectedModel, setSelectedModel] = useState<ComplAIModel | null>(currentModel || null)

  // Reset selected model when modal opens/closes or current model changes
  useEffect(() => {
    if (isOpen) {
      setSelectedModel(currentModel || null)
    }
  }, [isOpen, currentModel])

  const handleSave = async () => {
    try {
      await onSave(selectedModel)
      onClose()
    } catch (error) {
      console.error('Error saving model:', error)
    }
  }

  const handleCancel = () => {
    setSelectedModel(currentModel || null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden transform transition-all"
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
          <div className="p-6 space-y-4">
            {/* Current Model Display */}
            {currentModel && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Modèle actuel :</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{currentModel.model_name}</span>
                    {currentModel.model_provider && (
                      <span className="text-gray-600">• {currentModel.model_provider}</span>
                    )}
                    {currentModel.version && (
                      <span className="text-gray-500 text-sm">(v{currentModel.version})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Model Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau modèle :
              </label>
              <ModelSelector
                value={selectedModel?.id}
                onChange={(modelId, modelInfo) => setSelectedModel(modelInfo)}
                placeholder="Rechercher et sélectionner un modèle..."
                className="w-full"
              />
            </div>

            {/* Selected Model Preview */}
            {selectedModel && selectedModel.id !== currentModel?.id && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Nouveau modèle sélectionné :</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">{selectedModel.model_name}</span>
                    {selectedModel.model_provider && (
                      <span className="text-blue-700">• {selectedModel.model_provider}</span>
                    )}
                    {selectedModel.version && (
                      <span className="text-blue-600 text-sm">(v{selectedModel.version})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

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