'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface TooltipProps {
  title: string
  shortContent: string
  fullContent?: string
  icon?: string
  type?: 'question' | 'answer'
  position?: 'left' | 'right' | 'bottom' | 'auto'
  rank?: number  // Pour afficher le classement mondial (partenaires)
}

export default function Tooltip({ 
  title, 
  shortContent, 
  fullContent, 
  icon = '💡',
  type = 'question',
  position = 'auto',
  rank
}: TooltipProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [computedPosition, setComputedPosition] = useState<'left' | 'right' | 'bottom'>('bottom')
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Constantes selon la charte
  const SHORT_TEXT_THRESHOLD = 100 // Seuil pour texte court
  const MODAL_THRESHOLD = 200 // Si < 200, pas besoin de modal
  const MAX_CONTENT_LENGTH = 300 // Limite absolue
  
  // Configuration de largeur selon le type (adaptative: min/max)
  const widthConfig = type === 'question' 
    ? { minWidth: '450px', maxWidth: '600px' }
    : { minWidth: '350px', maxWidth: '500px' }
  
  // Style de largeur adapté au device
  const getWidthStyle = () => {
    if (isMobileDevice) {
      return { width: '90vw', maxWidth: '400px' }
    }
    return {
      minWidth: widthConfig.minWidth,
      maxWidth: widthConfig.maxWidth
    }
  }
  
  // Détermine si le texte nécessite une modal
  const needsModal = (fullContent && fullContent.length > MODAL_THRESHOLD) || 
                     (!fullContent && shortContent.length > MODAL_THRESHOLD)
  
  // Détection responsive pour mobile/tablette
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(typeof window !== 'undefined' && window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calcul automatique de la position si 'auto'
  useEffect(() => {
    if (position !== 'auto' || !tooltipRef.current) {
      setComputedPosition(position === 'auto' ? 'bottom' : position)
      return
    }

    const element = tooltipRef.current
    const rect = element.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Pour les réponses, déterminer si on est à gauche ou à droite de l'écran
    if (type === 'answer') {
      const centerX = windowWidth / 2
      const elementCenter = rect.left + rect.width / 2
      
      // Si l'élément est dans la moitié gauche, afficher à droite et vice-versa
      setComputedPosition(elementCenter < centerX ? 'right' : 'left')
    } else {
      // Pour les questions, toujours en dessous
      setComputedPosition('bottom')
    }
  }, [position, type])

  const handleClick = () => {
    if (needsModal) {
      setIsModalOpen(true)
      setShowFullContent(false)
    }
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setShowFullContent(false)
  }

  const handleShowMore = () => {
    setShowFullContent(true)
  }

  const contentToShow = showFullContent && fullContent ? fullContent : shortContent

  // Fonction pour générer le badge de classement mondial
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

  // Classes de positionnement pour le tooltip hover
  const getPositionClasses = () => {
    switch (computedPosition) {
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      case 'bottom':
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
    }
  }

  // Direction de la flèche selon la position
  const getArrowClasses = () => {
    switch (computedPosition) {
      case 'left':
        return 'absolute top-1/2 right-[-4px] transform -translate-y-1/2 w-2 h-2 bg-[#0080A3] rotate-45'
      case 'right':
        return 'absolute top-1/2 left-[-4px] transform -translate-y-1/2 w-2 h-2 bg-[#0080A3] rotate-45'
      case 'bottom':
      default:
        return 'absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#0080A3] rotate-45'
    }
  }

  return (
    <>
      {/* Icône avec hover preview */}
      <div 
        ref={tooltipRef}
        className="relative inline-block ml-2"
        onMouseEnter={() => !isMobileDevice && setIsHovering(true)}
        onMouseLeave={() => !isMobileDevice && setIsHovering(false)}
      >
        <button
          onClick={handleClick}
          className="relative group"
          type="button"
          aria-label="Afficher l'infobulle"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0080A3]/10 hover:bg-[#0080A3]/20 transition-colors">
            <HelpCircle className="h-3.5 w-3.5 text-[#0080A3]" />
          </div>
        </button>

        {/* Tooltip preview au survol - Desktop uniquement */}
        {isHovering && !isModalOpen && !isMobileDevice && (
          <div className={`absolute ${getPositionClasses()} z-50`}>
            <div 
              className="bg-[#0080A3] text-white text-sm px-6 py-4 rounded-lg shadow-xl relative break-words"
              style={getWidthStyle()}
            >
              {rank && <div className="mb-2">{getRankBadge()}</div>}
              <p>{shortContent}</p>
              <div className={getArrowClasses()}></div>
            </div>
          </div>
        )}
      </div>

      {/* Modal centrée - Uniquement si nécessaire */}
      {needsModal && isModalOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Modal */}
            <div 
              className="bg-[#0080A3] text-white rounded-xl shadow-2xl max-w-xs sm:max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec bouton fermer */}
              <div className="flex items-center justify-between p-4 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  {rank && <div className="ml-2">{getRankBadge()}</div>}
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

                {/* Bouton "En savoir plus" - Uniquement si fullContent existe et non affiché */}
                {fullContent && !showFullContent && fullContent.length > shortContent.length && (
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

