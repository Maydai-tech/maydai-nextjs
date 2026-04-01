import fixtures from '../fixtures/maydai-report-fixtures.json'
import { riskLevelCodeToReportLabel, type RiskLevelCode } from '@/lib/risk-level'
import { SLOT_KEYS, type SlotKey, type SlotStatus } from '@/lib/slot-statuses'
import { createClient } from '@supabase/supabase-js'

type Fixture = {
  id: string
  description: string
  expectedRisk: RiskLevelCode
  expectedSlots: Record<SlotKey, SlotStatus>
}

type GenerateReportResponse = {
  report?: string
  success?: boolean
  usecase_id?: string
  next_steps_saved?: boolean
  next_steps_extracted?: boolean
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

function getUsecaseIdForFixture(fixtureId: string): string | null {
  // Mode 1: variable dédiée par fixture
  const direct = process.env[`MAYDAI_USECASE_ID_${fixtureId.toUpperCase()}`]
  if (direct && direct.trim()) return direct.trim()

  // Mode 2: mapping JSON (ex: {"high_anchor":"uuid", ...})
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

describe('Contrat API /api/generate-report (invariants)', () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const token = process.env.MAYDAI_REGRESSION_TOKEN

  const typedFixtures = fixtures as unknown as Fixture[]

  test.each(typedFixtures)('$id', async (fixture) => {
    const usecaseId = getUsecaseIdForFixture(fixture.id)
    if (!token || !usecaseId) {
      // Contrat "désactivé" faute de secrets/IDs (ne doit pas casser CI).
      expect(true).toBe(true)
      return
    }

    const response = await fetch(`${baseUrl}/api/generate-report`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ usecase_id: usecaseId }),
    })

    expect(response.ok).toBe(true)
    const json = (await response.json()) as GenerateReportResponse
    expect(json).toBeDefined()
    expect(typeof json).toBe('object')
    expect(json.success).toBe(true)
    expect(typeof json.report).toBe('string')

    const reportObj = tryExtractJsonObject(json.report!)
    expect(reportObj).not.toBeNull()

    // 1) Risk invariant
    const expectedRiskLabel = riskLevelCodeToReportLabel(fixture.expectedRisk)
    expect(reportObj.evaluation_risque).toBeDefined()
    expect(reportObj.evaluation_risque.niveau).toBe(expectedRiskLabel)

    // 2) 9 slots exist + prefix invariant + non-empty invariant
    const slotTexts: Record<string, string> = {}
    for (const key of SLOT_KEYS) {
      const val = reportObj[key]
      expect(typeof val).toBe('string')
      const text = String(val).trim()
      expect(text.length).toBeGreaterThan(0)

      const prefix = expectedPrefix(fixture.expectedSlots[key])
      expect(text.startsWith(prefix)).toBe(true)

      const afterPrefix = stripKnownPrefix(text)
      expect(afterPrefix.length).toBeGreaterThan(0)

      slotTexts[key] = text
    }

    // 3) No duplication after light normalization
    const normalized = Object.fromEntries(
      Object.entries(slotTexts).map(([k, v]) => [k, normalizeLight(v)])
    ) as Record<string, string>

    for (let i = 0; i < SLOT_KEYS.length; i++) {
      for (let j = i + 1; j < SLOT_KEYS.length; j++) {
        const aKey = SLOT_KEYS[i]
        const bKey = SLOT_KEYS[j]
        const a = normalized[aKey]
        const b = normalized[bKey]
        expect(a).not.toBe('')
        expect(b).not.toBe('')
        expect(a).not.toBe(b)
      }
    }

    // 4) DB coherence (si l'API a écrit en base et si creds présents)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (json.next_steps_saved && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
      const { data, error } = await supabase
        .from('usecase_nextsteps')
        .select(SLOT_KEYS.join(','))
        .eq('usecase_id', usecaseId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      for (const key of SLOT_KEYS) {
        expect(String((data as any)[key] || '').trim()).toBe(slotTexts[key])
      }
    }
  }, 30000)
})

