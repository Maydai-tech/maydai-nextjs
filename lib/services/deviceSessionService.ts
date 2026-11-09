import { createHash } from 'node:crypto'
import { getServiceRoleClient } from '@/lib/maydai-calculator'
import { countAccountCollaborators } from '@/lib/subscription/quota-guards'
import { getCurrentUserPlan } from '@/lib/subscription/user-plan'
import {
  DeviceHeartbeatResponseSchema,
  type DeviceHeartbeatResponse,
} from '@/lib/validations/device-session'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface DeviceSessionRecordOptions {
  userId: string
  deviceId: string
  userAgentHash?: string | null
  rawIp?: string | null
  now?: Date
}

interface DeviceSessionRow {
  device_id?: string | null
  last_active_at?: string | null
}

function dbError(error: { message?: string; details?: string } | null, context: string): Error {
  console.error(context, error)
  return new Error(error?.message || error?.details || 'Erreur DB')
}

function hashIp(rawIp: string): string {
  return createHash('sha256').update(rawIp).digest('hex')
}

function distinctDeviceCount(rows: DeviceSessionRow[], sinceMs: number): number {
  const ids = new Set<string>()
  for (const row of rows) {
    if (!row.device_id || !row.last_active_at) continue
    const activeAt = Date.parse(row.last_active_at)
    if (Number.isFinite(activeAt) && activeAt >= sinceMs) {
      ids.add(row.device_id)
    }
  }
  return ids.size
}

export async function recordAndEvaluateDeviceSession(
  options: DeviceSessionRecordOptions
): Promise<DeviceHeartbeatResponse> {
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()
  const rawIp = options.rawIp?.trim() || null
  const ipHash = rawIp ? hashIp(rawIp) : null
  const admin = getServiceRoleClient()

  const { error: upsertError } = await admin.from('user_device_sessions').upsert(
    {
      user_id: options.userId,
      device_id: options.deviceId,
      last_active_at: nowIso,
      user_agent_hash: options.userAgentHash ?? null,
      ip_hash: ipHash,
    },
    { onConflict: 'user_id,device_id' }
  )

  if (upsertError) {
    throw dbError(upsertError, '[deviceSession] upsert')
  }

  const sevenDaysAgoIso = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString()
  const { data: sessionRows, error: sessionError } = await admin
    .from('user_device_sessions')
    .select('device_id, last_active_at')
    .eq('user_id', options.userId)
    .gte('last_active_at', sevenDaysAgoIso)

  if (sessionError) {
    throw dbError(sessionError, '[deviceSession] comptage')
  }

  const rows = (sessionRows ?? []) as DeviceSessionRow[]
  const activeLast2HoursCount = distinctDeviceCount(rows, now.getTime() - TWO_HOURS_MS)
  const activeLast7DaysCount = distinctDeviceCount(rows, now.getTime() - SEVEN_DAYS_MS)
  const multipleDevicesDetected = activeLast2HoursCount >= 2 || activeLast7DaysCount >= 3

  const userPlan = await getCurrentUserPlan(options.userId, admin)
  const collaboratorsCount = await countAccountCollaborators(options.userId, admin)
  const maxCollaborators = userPlan.planInfo.maxCollaborators ?? 2

  return DeviceHeartbeatResponseSchema.parse({
    multipleDevicesDetected,
    activeDevices2h: activeLast2HoursCount,
    activeDevices7d: activeLast7DaysCount,
    isFreemium: userPlan.planInfo.isFree === true,
    collaboratorsCount,
    maxCollaborators,
    canInviteMoreCollaborators: collaboratorsCount < maxCollaborators,
  })
}
