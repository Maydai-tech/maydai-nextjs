'use client'

const REGISTRE_LOGO_SRC = '/logos/logo-maydai/registre_maydai.svg'

interface RegistreMaydaiBadgeProps {
  /** Version compacte pour todo/dossier */
  compact?: boolean
  /** Version pour le header dashboard (à côté du nom) */
  inline?: boolean
  className?: string
}

/**
 * Badge "Registre MaydAI" réutilisable avec le logo officiel.
 * Utilisé dans la todo list (ligne registre), la section dossiers registre, et à côté du nom du dashboard.
 * En mode inline (header) : badge plus grand pour lisibilité du texte (48×48px mobile, 64×64px sm+), SANS fond.
 */
export default function RegistreMaydaiBadge({ compact = false, inline = false, className = '' }: RegistreMaydaiBadgeProps) {
  if (inline) {
    return (
      <span
        className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex-shrink-0 ${className}`}
        title="MaydAI est déclaré comme registre centralisé"
      >
        <img
          src={REGISTRE_LOGO_SRC}
          alt="Registre MaydAI"
          className="flex-shrink-0 object-contain w-full h-full"
          width={64}
          height={64}
        />
      </span>
    )
  }

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 ${className}`}
        title="MaydAI est déclaré comme registre centralisé"
      >
        <img
          src={REGISTRE_LOGO_SRC}
          alt="Registre MaydAI"
          className="flex-shrink-0 object-contain w-full h-full"
          width={48}
          height={48}
        />
      </span>
    )
  }

  // Mode défaut (section Dossier) : même rendu que compact — plus grand, sans fond
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 ${className}`}
      title="MaydAI est déclaré comme registre centralisé"
    >
      <img
        src={REGISTRE_LOGO_SRC}
        alt="Registre MaydAI"
        className="flex-shrink-0 object-contain w-full h-full"
        width={48}
        height={48}
      />
    </span>
  )
}
