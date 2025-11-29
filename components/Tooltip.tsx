'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  title: string
  shortContent: string
  fullContent?: string
  icon?: string
  type?: 'question' | 'answer'
  position?: 'left' | 'right' | 'bottom' | 'auto'
  rank?: number  // Pour afficher le classement mondial (partenaires)
  rankText?: string  // Pour afficher un rang textuel spécial (ex: "Challenger", "Leader Européen")
}

export default function Tooltip({ 
  title, 
  shortContent, 
  fullContent, 
  icon = '💡',
  type = 'question',
  position = 'auto',
  rank,
  rankText
}: TooltipProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [computedPosition, setComputedPosition] = useState<'left' | 'right' | 'bottom'>('bottom')
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Constantes selon la charte
  const MAX_HOVER_LENGTH = 300 // Limite pour hover (textes juridiques complets)
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
  
  // Le contenu à afficher dans le hover (fullContent si disponible, sinon shortContent)
  const displayContent = fullContent || shortContent
  
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

  // Toggle hover sur mobile (clic)
  const handleClick = () => {
    if (isMobileDevice) {
      setIsHovering(!isHovering)
    }
  }

  // Fonction pour générer le badge de classement mondial
  const getRankBadge = () => {
    // Si on a un rang textuel spécial, l'utiliser en priorité
    if (rankText) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90">
          {rankText}
        </span>
      )
    }
    
    // Sinon, utiliser le rang numérique si disponible
    if (rank) {
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
    
    return null
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

        {/* Tooltip au hover/survol - Desktop et mobile */}
        {isHovering && (
          <div className={`absolute ${getPositionClasses()} z-50`}>
            <div 
              className="bg-[#0080A3] text-white text-sm px-6 py-4 rounded-lg shadow-xl relative break-words"
              style={getWidthStyle()}
            >
              {(rank || rankText) && <div className="mb-2">{getRankBadge()}</div>}
              <p>{displayContent}</p>
              <div className={getArrowClasses()}></div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}


