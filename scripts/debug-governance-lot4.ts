/**
 * Lot 4 : rendu PDF réel, partage de compte, intégrité des 199 cas complétés.
 *
 * Commande :
 *   pnpm debug:governance-lot4
 */

import * as path from 'path'
import { execFileSync } from 'node:child_process'
import * as dotenv from 'dotenv'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PDFDocument } from '../app/(saas)/usecases/[id]/components/pdf/PDFDocument'
import type { PDFReportData } from '../app/(saas)/usecases/[id]/components/pdf/types'
import { getAuditIntegrityBadge } from '../lib/validations/governance-scores'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TEST_DEVICE_PREFIX = `lot4-test-${Date.now()}`

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
  console.log(`OK : ${message}`)
}

function buildPayload(governanceStamp: PDFReportData['governanceStamp']): PDFReportData {
  return {
    governanceStamp,
    useCase: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Cas test gouvernance',
      description: 'Description minimale pour le rendu PDF.',
      status: 'completed',
      block_e5_governance: [],
      block_e6_transparence: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      score_final: 70,
      score_model: 60,
      deployment_countries: ['France'],
      companies: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Entreprise test',
        industry: 'tech_data',
        city: 'Paris',
        country: 'France',
      },
      history: [],
    },
    riskLevel: { risk_level: 'limited', justification: 'Classification de test' },
    score: { score: 70, is_eliminated: false, category_scores: [] },
    nextSteps: { recommendations: 'Recommandation de test', timeline: '6 mois' },
    profile: { email: 'audit@maydai.test', first_name: 'Ada', last_name: 'Test' },
    generatedDate: '2026-01-02T00:00:00.000Z',
  }
}

async function renderPdf(data: PDFReportData): Promise<Buffer> {
  const element = React.createElement(PDFDocument, { data })
  return renderToBuffer(element)
}

function assertPdfBuffer(buffer: Buffer, label: string, minBytes: number): void {
  assert(buffer.subarray(0, 5).toString('utf8') === '%PDF-', `${label} commence par %PDF-`)
  assert(buffer.length > minBytes, `${label} pèse ${buffer.length} octets (> ${minBytes})`)
}

async function assertPdfRendering(): Promise<void> {
  const nullBuffer = await renderPdf(buildPayload(null))
  assertPdfBuffer(nullBuffer, 'PDF rétrocompatible (tampon null)', 100)

  const exploratory = getAuditIntegrityBadge({ audit_integrity_score: 25 })
  assert(exploratory?.colorVariant === 'red_orange', 'score 25 → red_orange')
  assert(exploratory?.level === 'exploratory', 'score 25 → exploratory')
  const exploratoryBuffer = await renderPdf(buildPayload(exploratory))
  assertPdfBuffer(exploratoryBuffer, 'PDF badge 25', 1000)

  const standard = getAuditIntegrityBadge({
    audit_integrity_score: 65,
    siren_collision_flag: true,
  })
  assert(standard?.colorVariant === 'blue', 'score 65 → blue')
  assert(standard?.level === 'standard', 'score 65 → standard')
  assert(
    standard?.secondaryNotice === 'Second registre non consolidé',
    'score 65 + collision → Second registre non consolidé'
  )
  const standardBuffer = await renderPdf(buildPayload(standard))
  assertPdfBuffer(standardBuffer, 'PDF badge 65', 1000)

  const high = getAuditIntegrityBadge({ audit_integrity_score: 90 })
  assert(high?.colorVariant === 'green_gold', 'score 90 → green_gold')
  assert(high?.level === 'high_integrity', 'score 90 → high_integrity')
  const highBuffer = await renderPdf(buildPayload(high))
  assertPdfBuffer(highBuffer, 'PDF badge 90', 1000)
}

function assertSignupUntouched(): void {
  execFileSync('git', ['diff', '--quiet', '--', 'app/(saas)/signup/SignupPage.tsx'], {
    stdio: 'pipe',
  })
  console.log('OK : SignupPage.tsx est inchangé')
}

async function assertCompletedUseCases(admin: SupabaseClient): Promise<void> {
  const { count: completedCount, error: completedError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (completedError) {
    console.error('[debug:governance-lot4] completed', completedError)
    throw new Error(completedError.message || completedError.details || 'Erreur DB')
  }
  assert(completedCount === 199, `status=completed reste à 199 (lu ${completedCount})`)

  const { count: intactCount, error: intactError } = await admin
    .from('usecases')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .is('audit_integrity_score', null)

  if (intactError) {
    console.error('[debug:governance-lot4] audit null', intactError)
    throw new Error(intactError.message || intactError.details || 'Erreur DB')
  }
  assert(
    intactCount === 199,
    `199 cas completed ont audit_integrity_score null (lu ${intactCount})`
  )
}

async function findOwnerUserId(admin: SupabaseClient): Promise<string> {
  const { data: ownerLink, error: ownerError } = await admin
    .from('user_companies')
    .select('user_id')
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (ownerError) {
    console.error('[debug:governance-lot4] owner', ownerError)
    throw new Error(ownerError.message || ownerError.details || 'Erreur DB')
  }

  const ownerRow = Array.isArray(ownerLink) ? ownerLink[0] : ownerLink
  const userId = ownerRow && typeof ownerRow.user_id === 'string' ? ownerRow.user_id : null
  if (!userId) {
    throw new Error('Aucun propriétaire de registre pour tester user_device_sessions')
  }
  return userId
}

async function assertDeviceSharing(admin: SupabaseClient, userId: string): Promise<void> {
  const { recordAndEvaluateDeviceSession } = await import('../lib/services/deviceSessionService')

  const first = await recordAndEvaluateDeviceSession({
    userId,
    deviceId: `${TEST_DEVICE_PREFIX}-a`,
    userAgentHash: 'lot4-test',
    rawIp: '203.0.113.10',
  })
  if (first.activeDevices2h === 1 && first.activeDevices7d === 1) {
    assert(first.multipleDevicesDetected === false, 'un seul appareil de test → pas de partage')
  } else {
    assert(
      first.multipleDevicesDetected === (first.activeDevices2h >= 2 || first.activeDevices7d >= 3),
      `premier appareil cohérent avec le seuil (2h=${first.activeDevices2h}, 7j=${first.activeDevices7d})`
    )
  }

  const second = await recordAndEvaluateDeviceSession({
    userId,
    deviceId: `${TEST_DEVICE_PREFIX}-b`,
    userAgentHash: 'lot4-test',
    rawIp: '203.0.113.11',
  })
  assert(second.multipleDevicesDetected === true, 'deux appareils de test dans 2 h → partage détecté')
  assert(second.activeDevices2h >= 2, `activeDevices2h >= 2 (lu ${second.activeDevices2h})`)
}

async function cleanupDevices(admin: SupabaseClient | null, userId: string | null): Promise<void> {
  if (!admin || !userId) return
  const { error } = await admin
    .from('user_device_sessions')
    .delete()
    .eq('user_id', userId)
    .like('device_id', `${TEST_DEVICE_PREFIX}%`)
  if (error) {
    console.error('[debug:governance-lot4] nettoyage sessions', error)
  } else {
    console.log('OK : sessions appareil de test supprimées')
  }
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local')
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let userId: string | null = null
  try {
    await assertPdfRendering()
    assertSignupUntouched()
    await assertCompletedUseCases(admin)
    userId = await findOwnerUserId(admin)
    await assertDeviceSharing(admin, userId)
  } finally {
    await cleanupDevices(admin, userId)
  }
}

main()
  .then(() => {
    console.log('OK : debug:governance-lot4 terminé')
  })
  .catch((error: unknown) => {
    console.error('[debug:governance-lot4]', error instanceof Error ? error.message : error)
    process.exit(1)
  })
