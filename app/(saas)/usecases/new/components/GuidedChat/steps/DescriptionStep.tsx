'use client'

import { Send, Sparkles } from 'lucide-react'

interface DescriptionStepProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onGenerateAI?: () => void
  isGenerating?: boolean
  canGenerate?: boolean
  error?: string
}

export default function DescriptionStep({
  value,
  onChange,
  onSubmit,
  onGenerateAI,
  isGenerating,
  canGenerate = true,
  error,
}: DescriptionStepProps) {
  return (
    <div className="space-y-3">
      {onGenerateAI && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0080A3]" />
            <span className="text-xs font-medium text-gray-600">Génération IA</span>
          </div>
          <button
            onClick={onGenerateAI}
            disabled={isGenerating || !canGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#0080A3] to-[#006080] text-white text-xs font-medium rounded-lg hover:from-[#006080] hover:to-[#005060] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Générer avec Mistral AI
              </>
            )}
          </button>
        </div>
      )}

      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#0080A3] transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder="Décrivez brièvement l'objectif, le fonctionnement et les utilisateurs de ce système IA..."
          className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent resize-none"
          autoFocus
        />
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">{value.length} caractères</p>
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0080A3] text-white text-xs font-medium hover:bg-[#006280] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3 w-3" />
            Valider
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
