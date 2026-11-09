import { z } from 'zod'

export const DeviceHeartbeatRequestSchema = z.object({
  deviceId: z.string().min(16).max(128),
  userAgentHash: z.string().max(128).optional().nullable(),
})

export type DeviceHeartbeatRequest = z.infer<typeof DeviceHeartbeatRequestSchema>

export const DeviceHeartbeatResponseSchema = z.object({
  multipleDevicesDetected: z.boolean(),
  activeDevices2h: z.number().int().nonnegative(),
  activeDevices7d: z.number().int().nonnegative(),
  isFreemium: z.boolean(),
  collaboratorsCount: z.number().int().nonnegative(),
  maxCollaborators: z.number().int().nonnegative(),
  canInviteMoreCollaborators: z.boolean(),
})

export type DeviceHeartbeatResponse = z.infer<typeof DeviceHeartbeatResponseSchema>
