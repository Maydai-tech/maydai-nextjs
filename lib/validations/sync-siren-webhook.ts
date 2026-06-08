import { z } from 'zod'
import { sirenSchema } from '@/lib/validations/registry'

export const SyncSirenWebhookSchema = z.object({
  userId: z.string().uuid(),
  siren: sirenSchema,
})

export type SyncSirenWebhookPayload = z.infer<typeof SyncSirenWebhookSchema>
