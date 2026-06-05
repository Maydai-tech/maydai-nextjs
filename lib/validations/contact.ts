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

export const contactSiteSchema = z.object({
  subject: z.enum(CONTACT_SUBJECT_OPTIONS),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{5,20}$/).optional(),
  message: z.string().optional(),
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
