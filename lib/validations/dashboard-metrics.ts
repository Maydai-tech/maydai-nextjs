import { z } from 'zod'

export const DashboardMetricsSchema = z.object({
  profileCompleteness: z.number().default(0),
  activeRegistries: z.number().default(0),
  evaluatedUsecases: z.number().default(0),
  invitedCollaborators: z.number().default(0),
})

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>
