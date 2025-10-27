'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface PartnerTooltipProps {
  shortContent: string
  fullContent?: string
  rank?: number
}

export default function PartnerTooltip({ shortContent, fullContent, rank }: PartnerTooltipProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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

  // Fonction pour générer le badge de classement
  const getRankBadge = () => {
    if (!rank) return null
    
    const getRankEmoji = (rank: number) => {
      if (rank === 1) return '🥇'
      if (rank === 2) return '🥈'
      if (rank === 3) return '🥉'
      return '📊'
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90">
        {getRankEmoji(rank)} #{rank} mondial
      </span>
    )
  }

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
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-[#0080A3]/10 hover:bg-[#0080A3]/20 transition-colors">
            <HelpCircle className="h-3 w-3 text-[#0080A3]" />
          </div>

          {/* Tooltip preview au survol - ouverture à droite */}
          {isHovering && !isModalOpen && (
            <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-[#0080A3] text-white text-sm px-4 py-3 rounded-lg shadow-xl relative">
                {rank && <div className="mb-2">{getRankBadge()}</div>}
                <p className="leading-relaxed whitespace-nowrap">{shortContent}</p>
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-[#0080A3] rotate-45"></div>
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
                  {rank && <span className="text-xl">{getRankBadge()}</span>}
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

