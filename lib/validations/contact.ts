import { z } from 'zod'

export const contactSiteSchema = z.object({
  subject: z.enum([
    'Support & Démo',
    'Presse & Média',
    'Partenariats & Fournisseurs',
    'Carrières',
    'Audit personnalisé',
  ]),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{5,20}$/).optional(),
  message: z.string().optional(),
  marketing_consent: z.boolean().default(false),
})

export type ContactSiteInput = z.infer<typeof contactSiteSchema>
