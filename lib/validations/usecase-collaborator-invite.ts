import { z } from 'zod'

export const InviteUsecaseCollaboratorSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  firstName: z.string().min(1, { message: 'firstName is required' }),
  lastName: z.string().min(1, { message: 'lastName is required' }),
  role: z.enum(['owner', 'user', 'human_oversight']).default('user'),
})

export type InviteUsecaseCollaboratorInput = z.infer<typeof InviteUsecaseCollaboratorSchema>
