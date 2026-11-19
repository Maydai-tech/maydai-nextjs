import { z } from 'zod'

export const SendDeletionConfirmationEmailParamsSchema = z.object({
  toEmail: z.string().email(),
  firstName: z.string().optional().nullable(),
  entityName: z.string().min(1),
  entityType: z.enum(['company', 'usecase']),
  confirmationLink: z.string().url(),
})
export type SendDeletionConfirmationEmailParams = z.infer<
  typeof SendDeletionConfirmationEmailParamsSchema
>

export const SendPurgeCompletedEmailParamsSchema = z.object({
  toEmail: z.string().email(),
  firstName: z.string().optional().nullable(),
  entityName: z.string().min(1),
  entityType: z.enum(['company', 'usecase']),
  dashboardLink: z.string().url().optional(),
})
export type SendPurgeCompletedEmailParams = z.infer<typeof SendPurgeCompletedEmailParamsSchema>

export const MailjetGovernanceSendResultSchema = z.object({
  success: z.boolean(),
  templateId: z.number().int().positive(),
  statusCode: z.number().int().nullable().optional(),
  messageStatus: z.string().nullable().optional(),
  messageId: z.union([z.string(), z.number()]).nullable().optional(),
  messageUuid: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
})
export type MailjetGovernanceSendResult = z.infer<typeof MailjetGovernanceSendResultSchema>

export const MailjetMessageDeliveryCheckSchema = z.object({
  messageId: z.string(),
  status: z.string(),
  statePermanent: z.boolean().optional(),
  attemptCount: z.number().int().optional(),
  historyEvents: z
    .array(
      z.object({
        eventType: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .optional(),
})
export type MailjetMessageDeliveryCheck = z.infer<typeof MailjetMessageDeliveryCheckSchema>
