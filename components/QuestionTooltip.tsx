'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface QuestionTooltipProps {
  title: string
  shortContent: string
  fullContent?: string
  icon?: string
}

export default function QuestionTooltip({ 
  title, 
  shortContent, 
  fullContent, 
  icon = '💡' 
}: QuestionTooltipProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)
    setShowFullContent(false)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setShowFullContent(false)
  }

  const handleShowMore = () => {
    setShowFullContent(true)
  }

  const contentToShow = showFullContent && fullContent ? fullContent : shortContent

  return (
    <>
      {/* Icône avec hover preview */}
      <div className="relative inline-block ml-2">
        <button
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleClick}
          className="relative group"
          type="button"
          aria-label="Afficher l'infobulle"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0080A3]/10 hover:bg-[#0080A3]/20 transition-colors">
            <HelpCircle className="h-3.5 w-3.5 text-[#0080A3]" />
          </div>

          {/* Tooltip preview au survol */}
          {isHovering && !isModalOpen && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-[#0080A3] text-white text-base px-6 py-4 rounded-lg shadow-xl whitespace-nowrap">
                <p>{shortContent}</p>
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#0080A3] rotate-45"></div>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Modal centrée */}
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <div 
              className="bg-[#0080A3] text-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec bouton fermer */}
              <div className="flex items-center justify-between p-4 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <button
                  onClick={handleClose}
                  className="hover:bg-white/10 p-1 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenu */}
              <div className="p-6">
                <p className="text-sm leading-relaxed mb-4">
                  {contentToShow}
                </p>

                {/* Bouton "En savoir plus" */}
                {fullContent && !showFullContent && (
                  <button
                    onClick={handleShowMore}
                    className="w-full px-4 py-2 border-2 border-white rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
                  >
                    En savoir plus
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
