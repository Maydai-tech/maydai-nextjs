import { z } from 'zod'

export const COMMERCIAL_SUBJECTS = [
  'Support & Démo',
  'Presse & Média',
  'Partenariats & Fournisseurs',
  'Carrières',
  'Audit personnalisé',
] as const

export const SUPPORT_SUBJECTS = [
  'Compte — changement d\'email',
  'Plateforme — utilisation',
  'IA Act — réglementation',
  'Formation & conformité',
  'Facturation & abonnement',
  'Audit personnalisé',
  'Autre demande',
] as const

export const CONTACT_SUBJECT_OPTIONS = [
  'Support & Démo',
  'Presse & Média',
  'Partenariats & Fournisseurs',
  'Carrières',
  'Audit personnalisé',
  'Compte — changement d\'email',
  'Plateforme — utilisation',
  'IA Act — réglementation',
  'Formation & conformité',
  'Facturation & abonnement',
  'Autre demande',
] as const

export const CONTACT_STATUS_OPTIONS = ['new', 'in_progress', 'closed'] as const

export const CONTACT_SOURCE_OPTIONS = [
  'contact_page',
  'support_page',
  'dashboard_support',
  'settings',
] as const

export const BLACKLISTED_TLDS = [
  '.online',
  '.xyz',
  '.top',
  '.click',
  '.ru',
  '.cn',
  '.tk',
  '.buzz',
  '.loan',
  '.work',
] as const

export const MIN_SUBMISSION_DELAY_MS = 3000

/**
 * Préfixes mobiles français 07 non attribués aux communications interpersonnelles par l'ARCEP
 * (réservés M2M ou non ouverts, utilisés par les générateurs de faux numéros comme 0733826732).
 */
const INVALID_FR_MOBILE_07_PREFIXES = ['070', '071', '072', '073', '079'] as const

function cleanHostname(rawHost: string): string {
  return rawHost
    .trim()
    .toLowerCase()
    .replace(/^[([<'"`]+/, '')
    .replace(/[)\].,;!?'"`:/>]+$/, '')
}

export function isHostBlacklisted(hostname: string): boolean {
  const cleaned = cleanHostname(hostname)
  if (!cleaned || !cleaned.includes('.')) return false
  return BLACKLISTED_TLDS.some((tld) => cleaned.endsWith(tld))
}

export function hasBlacklistedTldInEmail(email: string): boolean {
  const trimmed = (email || '').trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return false
  const domain = trimmed.slice(atIndex + 1)
  return isHostBlacklisted(domain)
}

/**
 * Détecte les URLs avec schéma (https://...) ainsi que les noms de domaine nus (partagepro.online/doc)
 * dans un texte libre et vérifie si l'un des hôtes appartient à la liste noire TLD.
 */
export function hasBlacklistedTldInText(text?: string | null): boolean {
  if (!text) return false

  const urlOrDomainRegex =
    /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}\b(?:\/[^\s]*)?/gi

  const matches = text.match(urlOrDomainRegex)
  if (!matches) return false

  for (const rawMatch of matches) {
    const withoutProtocol = rawMatch.replace(/^https?:\/\//i, '')
    const hostPortion = withoutProtocol.split(/[/?#]/)[0] ?? ''
    const hostOnly = hostPortion.split(':')[0] ?? ''
    if (isHostBlacklisted(hostOnly)) {
      return true
    }
  }

  return false
}

/**
 * Validation Téléphone Francophone (FR, BE, CH, LU, CA) + filtre strict ARCEP sur les mobiles FR.
 */
export function isValidFrancophonePhone(rawPhone: string): boolean {
  const trimmed = (rawPhone || '').trim()
  if (!trimmed) return false

  // Caractères autorisés de base
  if (!/^\+?[0-9\s.\-()]{8,22}$/.test(trimmed)) {
    return false
  }

  // Normalisation en conservant uniquement le '+' initial éventuel et les chiffres
  const normalized = trimmed.replace(/[\s.\-()]/g, '').replace(/^00/, '+')

  // Cas 1 : Numéro Français (+33XXXXXXXXX ou 0XXXXXXXXX)
  const isFrenchInternational = normalized.startsWith('+33')
  const isFrenchNational = /^0[1-9]\d{8}$/.test(normalized)

  if (isFrenchInternational || isFrenchNational || normalized.startsWith('0')) {
    const nationalFr = isFrenchInternational ? `0${normalized.slice(3)}` : normalized

    // Un numéro français valide comporte exactement 10 chiffres commençant par 0[1-9]
    if (!/^0[1-9]\d{8}$/.test(nationalFr)) {
      return false
    }

    // Règle ARCEP sur la tranche mobile 07
    if (nationalFr.startsWith('07')) {
      const prefix3 = nationalFr.slice(0, 3)
      if (
        (INVALID_FR_MOBILE_07_PREFIXES as readonly string[]).includes(prefix3)
      ) {
        return false
      }
    }

    return true
  }

  // Cas 2 : Numéros francophones internationaux avec indicatif (+32 BE, +41 CH, +352 LU, +1 CA)
  if (normalized.startsWith('+32')) {
    // Belgique : +32 suivi de 8 ou 9 chiffres (sans le 0 initial)
    return /^\+32[1-9]\d{7,8}$/.test(normalized)
  }

  if (normalized.startsWith('+41')) {
    // Suisse : +41 suivi de 9 chiffres
    return /^\+41[1-9]\d{8}$/.test(normalized)
  }

  if (normalized.startsWith('+352')) {
    // Luxembourg : +352 suivi de 6 à 9 chiffres
    return /^\+352[1-9]\d{5,8}$/.test(normalized)
  }

  if (normalized.startsWith('+1')) {
    // Canada / NANP : +1 suivi de 10 chiffres (NPA-NXX-XXXX)
    return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(normalized)
  }

  return false
}

export type BotTrapResult = {
  isBot: boolean
  reason?: 'honeypot_filled' | 'missing_timestamp' | 'invalid_timestamp' | 'submitted_too_fast'
}

export function evaluateBotTrap(params: {
  companyFax?: string | null
  formLoadedAt?: string | null
  now?: number
}): BotTrapResult {
  const { companyFax, formLoadedAt, now = Date.now() } = params

  if (companyFax && companyFax.trim().length > 0) {
    return { isBot: true, reason: 'honeypot_filled' }
  }

  if (!formLoadedAt || formLoadedAt.trim().length === 0) {
    return { isBot: true, reason: 'missing_timestamp' }
  }

  const parsedTimestamp = Number(formLoadedAt)
  if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
    return { isBot: true, reason: 'invalid_timestamp' }
  }

  const elapsedMs = now - parsedTimestamp
  if (elapsedMs < MIN_SUBMISSION_DELAY_MS) {
    return { isBot: true, reason: 'submitted_too_fast' }
  }

  return { isBot: false }
}

export const contactSiteSchema = z.object({
  subject: z.enum(CONTACT_SUBJECT_OPTIONS, {
    errorMap: () => ({ message: 'Veuillez sélectionner un motif valide.' }),
  }),
  first_name: z
    .string()
    .trim()
    .min(2, 'Le prénom doit contenir au moins 2 caractères.')
    .max(100, 'Le prénom est trop long.'),
  last_name: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom est trop long.'),
  email: z
    .string()
    .trim()
    .email('Veuillez saisir une adresse email valide.')
    .refine((val) => !hasBlacklistedTldInEmail(val), {
      message: 'Cette extension de domaine email n\'est pas autorisée.',
    }),
  phone: z
    .string()
    .trim()
    .refine((val) => isValidFrancophonePhone(val), {
      message:
        'Numéro de téléphone invalide (formats acceptés : France ARCEP, Belgique, Suisse, Luxembourg, Canada).',
    })
    .optional(),
  message: z
    .string()
    .trim()
    .max(5000, 'Le message ne peut pas dépasser 5000 caractères.')
    .refine((val) => !hasBlacklistedTldInText(val), {
      message: 'Le message contient un lien vers un domaine non autorisé.',
    })
    .optional(),
  marketing_consent: z.boolean().default(false),
  status: z.enum(CONTACT_STATUS_OPTIONS).optional().default('new'),
  source: z.enum(CONTACT_SOURCE_OPTIONS).optional().default('contact_page'),
  user_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  usecase_id: z.string().uuid().optional().nullable(),
})

export type ContactSiteInput = z.infer<typeof contactSiteSchema>
export type ContactSubject = (typeof CONTACT_SUBJECT_OPTIONS)[number]
export type ContactStatus = (typeof CONTACT_STATUS_OPTIONS)[number]
export type ContactSource = (typeof CONTACT_SOURCE_OPTIONS)[number]
