'use client'

import { useState } from 'react'
import { Send, HelpCircle } from 'lucide-react'
import ModelTooltip from '@/components/ModelTooltip'
import type { ModelOption } from '../../../types'

interface ModelSelectStepProps {
  models: ModelOption[]
  value: string
  onSelect: (modelName: string, modelId?: string) => void
  isCustomPartner: boolean
  partnerName: string
  loading?: boolean
  error?: string
}

export default function ModelSelectStep({
  models,
  value,
  onSelect,
  isCustomPartner,
  partnerName,
  loading,
  error,
}: ModelSelectStepProps) {
  const [customValue, setCustomValue] = useState(value || '')

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0080A3] border-t-transparent mx-auto mb-2" />
        <p className="text-sm text-gray-500">Chargement des modèles...</p>
      </div>
    )
  }

  if (isCustomPartner) {
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <HelpCircle className="h-5 w-5 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-blue-700">
            Partenaire personnalisé ({partnerName}). Saisissez le modèle utilisé.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-3">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (customValue.trim()) onSelect(customValue.trim())
              }
            }}
            placeholder="Nom du modèle utilisé..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            autoFocus
          />
          <button
            onClick={() => customValue.trim() && onSelect(customValue.trim())}
            disabled={!customValue.trim()}
            className="flex-shrink-0 p-1.5 rounded-lg bg-[#0080A3] text-white hover:bg-[#006280] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700">
            Aucun modèle trouvé pour {partnerName}. Saisissez le nom manuellement.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-3">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (customValue.trim()) onSelect(customValue.trim())
              }
            }}
            placeholder="Nom du modèle..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            autoFocus
          />
          <button
            onClick={() => customValue.trim() && onSelect(customValue.trim())}
            disabled={!customValue.trim()}
            className="flex-shrink-0 p-1.5 rounded-lg bg-[#0080A3] text-white hover:bg-[#006280] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // Sort models by launch_date DESC then model_name ASC
  const sortedModels = [...models].sort((a, b) => {
    if (a.launch_date && b.launch_date) {
      const diff = new Date(b.launch_date).getTime() - new Date(a.launch_date).getTime()
      if (diff !== 0) return diff
    }
    if (a.launch_date && !b.launch_date) return -1
    if (!a.launch_date && b.launch_date) return 1
    return a.model_name.localeCompare(b.model_name)
  })

  return (
    <div className="space-y-2">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {sortedModels.map((model) => {
          const isSelected = value === model.model_name
          return (
            <div
              key={model.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(model.model_name, model.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(model.model_name, model.id) } }}
              className={`flex items-start gap-3 p-3 border-2 rounded-xl text-left transition-all duration-200 w-full cursor-pointer ${
                isSelected
                  ? 'border-[#0080A3] bg-[#0080A3]/5'
                  : 'border-gray-200 hover:border-[#0080A3]/50 hover:bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-[#0080A3]' : 'border-gray-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-[#0080A3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{model.model_name}</span>
                  <ModelTooltip
                    notesShort={model.notes_short}
                    notesLong={model.notes_long}
                    launchDate={model.launch_date}
                  />
                </div>
                {model.variants && model.variants.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5 italic">
                    {model.variants.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
