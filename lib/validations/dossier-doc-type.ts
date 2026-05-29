import { z } from 'zod'

import { CANONICAL_DOC_TYPES } from '@/lib/canonical-actions'
import type { Database } from '@/types/supabase'

/** Valeurs `doc_type` alignées sur l'enum Postgres `public.doc_type` (post-migration training_plan). */
export const docTypeSchema = z.enum(CANONICAL_DOC_TYPES)

export type DocType = z.infer<typeof docTypeSchema>

/** Type enum Supabase (lecture/écriture client typé). */
export type SupabaseDocType = Database['public']['Enums']['doc_type']

export type DocStatus = Database['public']['Enums']['doc_status']
