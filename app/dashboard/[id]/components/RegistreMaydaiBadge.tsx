'use client'

import { BookMarked } from 'lucide-react'

const MAYDAI_PRIMARY = '#0080A3'

interface RegistreMaydaiBadgeProps {
  /** Version compacte (icône + texte court) pour todo/dossier */
  compact?: boolean
  /** Version pour le header dashboard (à côté du nom) */
  inline?: boolean
  className?: string
}

/**
 * Badge "Registre MaydAI" réutilisable (couleur de marque MaydAI).
 * Utilisé dans la todo list (ligne registre), la section dossiers registre, et à côté du nom du dashboard.
 */
export default function RegistreMaydaiBadge({ compact = false, inline = false, className = '' }: RegistreMaydaiBadgeProps) {
  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${className}`}
        style={{ backgroundColor: `${MAYDAI_PRIMARY}18`, color: MAYDAI_PRIMARY, border: `1px solid ${MAYDAI_PRIMARY}40` }}
        title="MaydAI est déclaré comme registre centralisé"
      >
        <BookMarked className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MAYDAI_PRIMARY }} />
        <span>Registre MaydAI</span>
      </span>
    )
  }

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${className}`}
        style={{ backgroundColor: `${MAYDAI_PRIMARY}18`, color: MAYDAI_PRIMARY, border: `1px solid ${MAYDAI_PRIMARY}40` }}
        title="MaydAI est déclaré comme registre centralisé"
      >
        <BookMarked className="w-3.5 h-3.5 flex-shrink-0" style={{ color: MAYDAI_PRIMARY }} />
        <span>Registre MaydAI</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${className}`}
      style={{ backgroundColor: `${MAYDAI_PRIMARY}18`, color: MAYDAI_PRIMARY, border: `1px solid ${MAYDAI_PRIMARY}40` }}
      title="MaydAI est déclaré comme registre centralisé"
    >
      <BookMarked className="w-4 h-4 flex-shrink-0" style={{ color: MAYDAI_PRIMARY }} />
      <span>Registre MaydAI</span>
    </span>
  )
}
