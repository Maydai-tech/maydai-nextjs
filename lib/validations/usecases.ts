import { z } from 'zod'

/**
 * Contrat JSONB pour `usecases.checklist_gov_enterprise` et `usecases.checklist_gov_usecase`.
 * En base : tableau plat de codes d’options (ex. `["E5.N9.Q7.B"]`).
 */

export const ChecklistAnswerSchema = z
  .object({
    question_code: z.string().min(1),
    single_value: z.string().optional(),
    multiple_codes: z.array(z.string()).optional(),
  })
  .strict()

/** Structure ligne réponse (scoring / API) — distinct du format JSONB checklist. */
export type ChecklistAnswer = z.infer<typeof ChecklistAnswerSchema>

/** Codes d’options persistés dans `usecases.checklist_gov_*` (JSONB string[]). */
export const ChecklistArraySchema = z.array(z.string())

export type ChecklistCodeArray = z.infer<typeof ChecklistArraySchema>
