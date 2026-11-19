import { SIGNUP_HREF } from '@/lib/signup-utm-hrefs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Icône affichée dans un sous-menu (chemin public + texte alternatif). */
export interface MarketingNavIcon {
  readonly src: string
  readonly alt: string
}

/** Lien terminal : possède un `href`, pas de sous-menu. */
export interface MarketingNavLink {
  readonly type: 'link'
  readonly label: string
  readonly href: string
  readonly icon?: MarketingNavIcon
}

/** Groupe déroulant : déclencheur sans `href`, enfants obligatoires. */
export interface MarketingNavDropdown {
  readonly type: 'dropdown'
  readonly label: string
  readonly children: readonly MarketingNavLink[]
}

export type MarketingNavItem = MarketingNavLink | MarketingNavDropdown

/** Lien plat du footer (pas de sous-menu). */
export interface MarketingFooterLink {
  readonly label: string
  readonly href: string
}

/** CTA du header (zone droite, hors menu principal). */
export interface MarketingHeaderCta {
  readonly label: string
  readonly href: string
  readonly variant: 'primary' | 'secondary'
}

export interface MarketingHeaderCtas {
  readonly authenticated: readonly MarketingHeaderCta[]
  readonly unauthenticated: readonly MarketingHeaderCta[]
}

// ---------------------------------------------------------------------------
// Icônes réutilisées (sous-menus Header)
// ---------------------------------------------------------------------------

const IA_ACT_ICONS = {
  overview: { src: '/icons/eye.png', alt: 'Oeil' },
  calendar: { src: '/icons/calendar.png', alt: 'Calendrier' },
  risks: { src: '/icons/caution-1.png', alt: 'Attention' },
} as const satisfies Record<string, MarketingNavIcon>

const FONCTIONNALITES_ICONS = {
  all: { src: '/icons/app.png', alt: 'Toutes les fonctionnalités' },
  audit: { src: '/icons/audit.png', alt: 'Audit IA Act' },
  conformite: { src: '/icons/balance-1.png', alt: 'Conformité IA' },
  impact: { src: '/icons/ecosystem.png', alt: 'Impact Environnemental' },
} as const satisfies Record<string, MarketingNavIcon>

const CONTACT_ICONS = {
  support: { src: '/icons/chats.png', alt: 'Support Client' },
  about: { src: '/icons/corporation.png', alt: 'À propos' },
  form: { src: '/icons/chats.png', alt: 'Nous contacter' },
} as const satisfies Record<string, MarketingNavIcon>

// ---------------------------------------------------------------------------
// Navigation principale — Header (desktop + mobile)
// ---------------------------------------------------------------------------

/**
 * Menu principal du site vitrine.
 * Nomenclature métier : Fonctionnalités et Contact regroupent les pages
 * produit et les points de contact (support, à propos, formulaire).
 */
export const MARKETING_HEADER_NAVIGATION: readonly MarketingNavItem[] = [
  {
    type: 'dropdown',
    label: 'IA Act',
    children: [
      {
        type: 'link',
        label: "Vue d'ensemble",
        href: '/ia-act-ue',
        icon: IA_ACT_ICONS.overview,
      },
      {
        type: 'link',
        label: 'Calendrier IA Act',
        href: '/ia-act-ue/calendrier',
        icon: IA_ACT_ICONS.calendar,
      },
      {
        type: 'link',
        label: 'Pyramide risques IA',
        href: '/ia-act-ue/risques',
        icon: IA_ACT_ICONS.risks,
      },
    ],
  },
  {
    type: 'dropdown',
    label: 'Fonctionnalités',
    children: [
      {
        type: 'link',
        label: 'Toutes les fonctionnalités',
        href: '/fonctionnalites',
        icon: FONCTIONNALITES_ICONS.all,
      },
      {
        type: 'link',
        label: 'Audit IA Act',
        href: '/audit-ia-act',
        icon: FONCTIONNALITES_ICONS.audit,
      },
      {
        type: 'link',
        label: 'Conformité IA',
        href: '/conformite-ia',
        icon: FONCTIONNALITES_ICONS.conformite,
      },
      {
        type: 'link',
        label: 'Impact Environnemental',
        href: '/impact-environnemental',
        icon: FONCTIONNALITES_ICONS.impact,
      },
    ],
  },
  {
    type: 'link',
    label: 'Sécurité',
    href: '/securite',
  },
  {
    type: 'link',
    label: 'Tarifs',
    href: '/tarifs',
  },
  {
    type: 'dropdown',
    label: 'Contact',
    children: [
      {
        type: 'link',
        label: 'Nous contacter',
        href: '/contact',
        icon: CONTACT_ICONS.form,
      },
      {
        type: 'link',
        label: 'À propos',
        href: '/a-propos',
        icon: CONTACT_ICONS.about,
      },
      {
        type: 'link',
        label: 'Support Client',
        href: '/support',
        icon: CONTACT_ICONS.support,
      },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// CTAs Header (authentifié / visiteur)
// ---------------------------------------------------------------------------

export const MARKETING_HEADER_CTAS: MarketingHeaderCtas = {
  authenticated: [
    {
      label: 'Dashboard',
      href: '/dashboard/registries',
      variant: 'primary',
    },
  ],
  unauthenticated: [
    {
      label: 'Connexion',
      href: '/login',
      variant: 'secondary',
    },
    {
      label: 'Commencer',
      href: SIGNUP_HREF.navbar_header,
      variant: 'primary',
    },
  ],
} as const

// ---------------------------------------------------------------------------
// Navigation — Footer (liens plats)
// ---------------------------------------------------------------------------

/**
 * Liens du footer. Libellés conservés tels qu'affichés dans Footer.jsx
 * (accents, « Fonctionnalités » vs « Fonctionnalites » du header, etc.).
 */
export const MARKETING_FOOTER_NAVIGATION: readonly MarketingFooterLink[] = [
  { label: 'Sécurité', href: '/securite' },
  { label: 'Fonctionnalités', href: '/fonctionnalites' },
  { label: 'Impact Environnemental', href: '/impact-environnemental' },
  { label: 'Tarifs', href: '/tarifs' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'Contact', href: '/contact' },
  { label: 'Confidentialité', href: '/politique-confidentialite' },
  { label: 'CGU', href: '/conditions-generales' },
] as const

// ---------------------------------------------------------------------------
// Helpers (consommation future par Header / Footer)
// ---------------------------------------------------------------------------

export function isMarketingNavDropdown(
  item: MarketingNavItem
): item is MarketingNavDropdown {
  return item.type === 'dropdown'
}

export function isMarketingNavLink(item: MarketingNavItem): item is MarketingNavLink {
  return item.type === 'link'
}

/** Liens simples du header (hors groupes déroulants). */
export function getMarketingHeaderFlatLinks(): MarketingNavLink[] {
  return MARKETING_HEADER_NAVIGATION.filter(isMarketingNavLink)
}

/** Groupes déroulants du header. */
export function getMarketingHeaderDropdowns(): MarketingNavDropdown[] {
  return MARKETING_HEADER_NAVIGATION.filter(isMarketingNavDropdown)
}
