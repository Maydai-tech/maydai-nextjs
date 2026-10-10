import { z } from 'zod'

export const PROCUREMENT_PHASES = { consultation: 'Consultation', rfi: 'RFI', rfp: 'RFP', final: 'Phase finale' } as const
export const PROCUREMENT_CRITERIA = [
  { id: 'human_oversight', label: 'Contrôle humain', description: 'Validation humaine des contenus et des décisions IA.' },
  { id: 'transparency', label: 'Transparence', description: 'Information des utilisateurs et identification des contenus générés.' },
  { id: 'social_ethics', label: 'Impact social / éthique', description: 'Biais, non-discrimination et usages sensibles.' },
  { id: 'environment', label: 'Environnement', description: 'Empreinte des modèles et de leur hébergement.' },
  { id: 'cybersecurity', label: 'Cybersécurité', description: 'Robustesse, injections de prompt et prévention des fuites.' },
  { id: 'data_governance', label: 'Gouvernance des données', description: 'Confidentialité, protection des données et hébergement.' },
] as const
export type CriterionId = typeof PROCUREMENT_CRITERIA[number]['id']
export type CriteriaImportance = Record<CriterionId, number>
export const DEFAULT_IMPORTANCE: CriteriaImportance = { human_oversight: 5, transparency: 5, social_ethics: 5, environment: 5, cybersecurity: 5, data_governance: 5 }
export const QUESTION_TYPES = { short_text: 'Texte court', long_text: 'Texte long', single_choice: 'Choix unique', multiple_choice: 'Choix multiple', file: 'Fichier' } as const

const importance = z.number({ required_error: 'Renseignez l’importance du critère.', invalid_type_error: 'Saisissez une importance entre 0 et 10.' }).int('L’importance doit être un entier.').min(0, 'L’importance doit être comprise entre 0 et 10.').max(10, 'L’importance doit être comprise entre 0 et 10.')
const CriteriaSchema = z.object({ human_oversight: importance, transparency: importance, social_ethics: importance, environment: importance, cybersecurity: importance, data_governance: importance }).strict()
const questionBase = { id: z.string().uuid(), label: z.string().trim().min(1, 'Renseignez l’intitulé de la question.').max(2000, 'L’intitulé est limité à 2 000 caractères.') }
const options = z.array(z.string().trim().min(1, 'Une option ne peut pas être vide.').max(200)).min(2, 'Ajoutez au moins deux options.').refine((items) => new Set(items.map((item) => item.toLocaleLowerCase('fr'))).size === items.length, 'Les options doivent être distinctes.')
export const ProcurementQuestionSchema = z.discriminatedUnion('type', [
  z.object({ ...questionBase, type: z.literal('short_text') }),
  z.object({ ...questionBase, type: z.literal('long_text') }),
  z.object({ ...questionBase, type: z.literal('file') }),
  z.object({ ...questionBase, type: z.literal('single_choice'), options }),
  z.object({ ...questionBase, type: z.literal('multiple_choice'), options }),
])
export type ProcurementQuestion = z.infer<typeof ProcurementQuestionSchema>
export function normalizeSupplierEmails(emails: string[]): string[] {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))]
}
export const ProcurementInputSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire.').max(200, 'Le titre est limité à 200 caractères.'),
  description: z.string().trim().min(1, 'La description du besoin est obligatoire.').max(5000, 'La description est limitée à 5 000 caractères.'),
  phase: z.enum(['consultation', 'rfi', 'rfp', 'final'], { required_error: 'Choisissez une phase.' }),
  criteria_importance: CriteriaSchema,
  custom_questions: z.array(ProcurementQuestionSchema).refine((items) => new Set(items.map((item) => item.id)).size === items.length, 'Les questions doivent avoir des identifiants distincts.').default([]),
  deadline_at: z.string().datetime({ offset: true, message: 'Renseignez une date et une heure de clôture valides.' }).refine((value) => Date.parse(value) > Date.now(), 'La clôture doit être dans le futur.').transform((value) => new Date(value).toISOString()),
  supplier_emails: z.array(z.string().trim().email('L’adresse email du fournisseur est invalide.')).min(1, 'Ajoutez au moins un email fournisseur.').transform(normalizeSupplierEmails),
})
export type ProcurementInput = z.infer<typeof ProcurementInputSchema>
// Nullable/absent configuration supports historical records and older list consumers.
export interface Procurement {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
  phase?: ProcurementInput['phase'] | null
  criteria_importance?: CriteriaImportance | null
  custom_questions?: ProcurementQuestion[]
  deadline_at?: string | null
  supplier_emails?: string[]
}
