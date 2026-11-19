import type { SupabaseClient } from '@supabase/supabase-js'

import { persistCompariaCatalog, type PersistCompariaCatalogResult } from '@/lib/comparia/catalog-sync'
import { parseCompariaCsv } from '@/lib/comparia/import'
import { findFileIdByName, getFileFromDrive } from '@/lib/google-drive'

export const DEFAULT_COMPARIA_DRIVE_FILE_NAME = 'leaderboard.csv'

export type SyncCompariaCatalogFromDriveResult = PersistCompariaCatalogResult & {
  fileName: string
}

export function resolveCompariaDriveFileName(explicit?: string | null): string {
  const fromArg = explicit?.trim()
  if (fromArg) return fromArg
  const fromEnv = process.env.COMPARIA_DRIVE_FILE_NAME?.trim()
  if (fromEnv) return fromEnv
  return DEFAULT_COMPARIA_DRIVE_FILE_NAME
}

export async function syncCompariaCatalogFromDrive(
  supabase: SupabaseClient,
  fileName?: string | null,
): Promise<SyncCompariaCatalogFromDriveResult> {
  const resolved = resolveCompariaDriveFileName(fileName)
  const fileId = await findFileIdByName(resolved)
  const csvContent = await getFileFromDrive(fileId)
  const rows = parseCompariaCsv(csvContent)
  if (rows.length === 0) {
    throw new Error('Aucune ligne valide dans le CSV Compar:IA')
  }

  const result = await persistCompariaCatalog(supabase, {
    rows,
    fileName: resolved,
  })

  return { ...result, fileName: resolved }
}
