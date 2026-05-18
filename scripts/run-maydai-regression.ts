/* eslint-disable no-console */
import fixtures from '../tests/fixtures/maydai-report-fixtures.json'
import { computeSlotStatuses, SLOT_KEYS, type SlotKey, type SlotStatus } from '../lib/slot-statuses'
import { deriveRiskLevelFromResponses, riskLevelCodeToReportLabel, type RiskLevelCode } from '../lib/risk-level'
import { createClient } from '@supabase/supabase-js'

type Fixture = {
  id: string
  description: string
  uiReachable: boolean
  answers: Array<{
    question_code: string
    single_value?: string | null
    multiple_codes?: string[] | null
    conditional_main?: string | null
    conditional_keys?: string[] | null
    conditional_values?: string[] | null
  }>
  expectedRisk: RiskLevelCode
  expectedSlots: Record<SlotKey, SlotStatus>
}

type SummaryRow = {
  id: string
  ok: boolean
  riskMismatch?: string
  slotMismatch?: string[]
  apiMismatch?: string[]
  dbMismatch?: string[]
  duplicateWarning?: string[]
}

function expectedPrefix(status: SlotStatus): string {
  return `${status} :`
}

function stripKnownPrefix(s: string): string {
  return s.replace(/^(OUI|NON|Information insuffisante)\s*:\s*/i, '').trim()
}

function normalizeLight(s: string): string {
  return stripKnownPrefix(s)
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-zà-ÿ0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tryExtractJsonObject(text: string): any | null {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function getUsecaseIdForFixture(fixtureId: string): string | null {
  const direct = process.env[`MAYDAI_USECASE_ID_${fixtureId.toUpperCase()}`]
  if (direct && direct.trim()) return direct.trim()
  const mappingRaw = process.env.MAYDAI_USECASE_IDS
  if (!mappingRaw) return null
  try {
    const mapping = JSON.parse(mappingRaw) as Record<string, string>
    const fromMap = mapping[fixtureId]
    return fromMap?.trim() || null
  } catch {
    return null
  }
}

async function run(): Promise<void> {
  const typedFixtures = fixtures as unknown as Fixture[]

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const token = process.env.MAYDAI_REGRESSION_TOKEN
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase =
    supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null

  const rows: SummaryRow[] = []

  for (const fixture of typedFixtures) {
    const row: SummaryRow = { id: fixture.id, ok: true }

    // 1) Risque (autoritatif)
    const risk = deriveRiskLevelFromResponses(fixture.answers)
    if (risk !== fixture.expectedRisk) {
      row.ok = false
      row.riskMismatch = `expected=${fixture.expectedRisk} actual=${risk}`
    }

    // 2) Slots (statuts autoritatifs)
    const statuses = computeSlotStatuses(fixture.answers)
    const slotMismatches: string[] = []
    for (const key of SLOT_KEYS) {
      if (statuses[key] !== fixture.expectedSlots[key]) {
        slotMismatches.push(`${key}: expected=${fixture.expectedSlots[key]} actual=${statuses[key]}`)
      }
    }
    if (slotMismatches.length > 0) {
      row.ok = false
      row.slotMismatch = slotMismatches
    }

    // 3) Contrat API (optionnel)
    const usecaseId = getUsecaseIdForFixture(fixture.id)
    if (token && usecaseId) {
      const apiIssues: string[] = []
      const dupWarnings: string[] = []

      try {
        const resp = await fetch(`${baseUrl}/api/generate-report`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ usecase_id: usecaseId }),
        })

        if (!resp.ok) {
          apiIssues.push(`HTTP ${resp.status}`)
        } else {
          const payload = (await resp.json()) as any
          const reportText = String(payload?.report || '')
          const obj = tryExtractJsonObject(reportText)
          if (!obj) {
            apiIssues.push('report JSON non parseable')
          } else {
            const expectedRiskLabel = riskLevelCodeToReportLabel(fixture.expectedRisk)
            const niveau = obj?.evaluation_risque?.niveau
            if (niveau !== expectedRiskLabel) {
              apiIssues.push(`risk label mismatch: expected="${expectedRiskLabel}" actual="${String(niveau)}"`)
            }

            const slotTexts: Record<string, string> = {}
            for (const key of SLOT_KEYS) {
              const raw = obj?.[key]
              if (typeof raw !== 'string') {
                apiIssues.push(`${key} missing`)
                continue
              }
              const text = raw.trim()
              if (!text) {
                apiIssues.push(`${key} empty`)
                continue
              }
              const prefix = expectedPrefix(fixture.expectedSlots[key])
              if (!text.startsWith(prefix)) {
                apiIssues.push(`${key} bad prefix (expected "${prefix}")`)
              }
              if (!stripKnownPrefix(text)) {
                apiIssues.push(`${key} empty after prefix`)
              }
              slotTexts[key] = text
            }

            // duplication warning (non-bloquant dans le script, mais visible)
            const normalized = Object.fromEntries(
              Object.entries(slotTexts).map(([k, v]) => [k, normalizeLight(v)])
            ) as Record<string, string>
            const seen = new Map<string, string>()
            for (const key of SLOT_KEYS) {
              const n = normalized[key]
              if (!n) continue
              const prev = seen.get(n)
              if (prev) {
                dupWarnings.push(`${prev} == ${key}`)
              } else {
                seen.set(n, key)
              }
            }

            // cohérence DB (si possible)
            if (payload?.next_steps_saved && supabase) {
              const { data, error } = await supabase
                .from('usecase_nextsteps')
                .select(SLOT_KEYS.join(','))
                .eq('usecase_id', usecaseId)
                .single()
              if (error) {
                apiIssues.push(`db read error: ${error.message}`)
              } else {
                const dbMismatches: string[] = []
                for (const key of SLOT_KEYS) {
                  const dbVal = String((data as any)?.[key] || '').trim()
                  const apiVal = String(slotTexts[key] || '').trim()
                  if (apiVal && dbVal && apiVal !== dbVal) {
                    dbMismatches.push(`${key}`)
                  }
                }
                if (dbMismatches.length > 0) {
                  row.ok = false
                  row.dbMismatch = dbMismatches
                }
              }
            }
          }
        }
      } catch (e: any) {
        apiIssues.push(`fetch error: ${e?.message || String(e)}`)
      }

      if (apiIssues.length > 0) {
        row.ok = false
        row.apiMismatch = apiIssues
      }
      if (dupWarnings.length > 0) {
        row.duplicateWarning = dupWarnings
      }
    }

    rows.push(row)
  }

  const passed = rows.filter(r => r.ok).length
  const failed = rows.length - passed

  console.log('## MaydAI — Regression summary')
  console.log('')
  console.log(`- **passed**: ${passed}`)
  console.log(`- **failed**: ${failed}`)
  console.log('')

  for (const r of rows) {
    const status = r.ok ? '✅' : '❌'
    console.log(`### ${status} ${r.id}`)
    if (r.riskMismatch) console.log(`- **risk mismatch**: ${r.riskMismatch}`)
    if (r.slotMismatch?.length) console.log(`- **slot mismatch**: ${r.slotMismatch.join(' | ')}`)
    if (r.apiMismatch?.length) console.log(`- **api mismatch**: ${r.apiMismatch.join(' | ')}`)
    if (r.dbMismatch?.length) console.log(`- **db mismatch**: ${r.dbMismatch.join(', ')}`)
    if (r.duplicateWarning?.length) console.log(`- **duplicate content warning**: ${r.duplicateWarning.join(' | ')}`)
    console.log('')
  }

  if (failed > 0) {
    process.exitCode = 1
  }
}

run().catch((e) => {
  console.error(e)
  process.exitCode = 1
})

