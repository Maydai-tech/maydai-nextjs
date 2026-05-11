import { z } from 'zod'

/**
 * Contrat JSONB pour `usecases.checklist_gov_enterprise` et `usecases.checklist_gov_usecase`.
 * Aligné sur le sous-ensemble utile de `UserResponse` (scoring V2/V3), sans champs conditionnels hérités.
 */

export const ChecklistAnswerSchema = z
  .object({
    question_code: z.string().min(1),
    single_value: z.string().optional(),
    multiple_codes: z.array(z.string()).optional(),
  })
  .strict()

export type ChecklistAnswer = z.infer<typeof ChecklistAnswerSchema>

export const ChecklistArraySchema = z.array(ChecklistAnswerSchema)
