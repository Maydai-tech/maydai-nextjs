/** @jest-environment node */

import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION = 'supabase/migrations/20261116140000_protect_entity_lifecycle_columns.sql'

const COMPANY_COLUMNS = [
  'lifecycle_status',
  'deletion_token_hash',
  'purge_requested_at',
  'purge_available_at',
  'soft_deleted_at',
] as const

const USECASE_COLUMNS = [
  ...COMPANY_COLUMNS,
  'audit_integrity_score',
  'input_telemetry',
] as const

function loadMigration(): string {
  return readFileSync(join(process.cwd(), MIGRATION), 'utf8')
}

describe('protect entity lifecycle columns (migration)', () => {
  const sql = loadMigration()

  test('blocks authenticated members from rewriting company purge columns', () => {
    expect(sql).toContain('protect_company_lifecycle_columns')
    expect(sql).toContain('trg_protect_company_lifecycle_columns')
    expect(sql).toContain('BEFORE UPDATE ON public.companies')
    expect(sql).toContain("current_setting('role', true) = 'authenticated'")
    expect(sql).toContain('NOT public.is_admin_or_super_admin(auth.uid())')
    for (const column of COMPANY_COLUMNS) {
      expect(sql).toContain(`NEW.${column} := OLD.${column}`)
    }
  })

  test('blocks authenticated members from rewriting usecase purge and audit columns', () => {
    expect(sql).toContain('protect_usecase_lifecycle_columns')
    expect(sql).toContain('trg_protect_usecase_lifecycle_columns')
    expect(sql).toContain('BEFORE UPDATE ON public.usecases')
    for (const column of USECASE_COLUMNS) {
      expect(sql).toContain(`NEW.${column} := OLD.${column}`)
    }
  })

  test('leaves service_role and admin writes unrestricted', () => {
    expect(sql).not.toContain("current_setting('role', true) = 'service_role'")
    expect(sql).toContain('AND NOT public.is_admin_or_super_admin(auth.uid())')
  })
})
