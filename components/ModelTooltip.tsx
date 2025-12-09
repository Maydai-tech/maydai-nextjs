'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

interface ModelTooltipProps {
  notesShort?: string
  notesLong?: string
  className?: string
}

export default function ModelTooltip({ notesShort, notesLong, className = '' }: ModelTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Ne rien afficher si pas de notes
  if (!notesShort && !notesLong) {
    return null
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Icône Info */}
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-4 h-4 ml-1 text-blue-500 hover:text-blue-700 transition-colors cursor-help"
        aria-label="Voir les informations du modèle"
      >
        <Info className="w-4 h-4" />
      </button>

      {/* Tooltip */}
      {isVisible && (
        <>
          {/* Backdrop pour mobile */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setIsVisible(false)}
          />
          
          {/* Contenu de l'infobulle */}
          <div 
            className="absolute left-0 top-6 z-50 w-72 md:w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Flèche */}
            <div className="absolute -top-2 left-2 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45" />
            
            {/* Contenu */}
            <div className="relative z-10 bg-white">
              {notesShort && (
                <div className="font-semibold text-gray-900 text-sm mb-2">
                  {notesShort}
                </div>
              )}
              
              {notesLong && (
                <div className="text-gray-600 text-xs leading-relaxed">
                  {notesLong}
                </div>
              )}
            </div>

            {/* Bouton fermer pour mobile */}
            <button
              onClick={() => setIsVisible(false)}
              className="md:hidden absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}


