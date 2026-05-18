import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'

// tsconfig.json uses `"module": "esnext"` + `"moduleResolution": "bundler"`.
// When running with ts-node, Node's ESM resolver won't resolve TS imports without an extension.
// Using createRequire + explicit `.ts` keeps this script executable without touching app code.
const require = createRequire(import.meta.url)
const { extractNextStepsFromReport } = require('../lib/nextsteps-parser.ts') as typeof import('../lib/nextsteps-parser')

type CheckResult = { ok: true; message: string } | { ok: false; message: string; details?: unknown }

const EXPECTED_RISK_LABEL_UNACCEPTABLE = 'Interdit'

function env(name: string, { optional = false }: { optional?: boolean } = {}): string | undefined {
  const v = process.env[name]
  if (!v || !v.trim()) {
    if (optional) return undefined
    throw new Error(`Missing required env var: ${name}`)
  }
  return v.trim()
}

function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.trim().toLowerCase())
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function normalizeLight(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function tryExtractJsonObject(text: string): Record<string, any> | null {
  const trimmed = text.trim()
  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const parsed = JSON.parse(match[0])
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
}

function truncate(s: unknown, max = 180): string {
  const str = typeof s === 'string' ? s : JSON.stringify(s)
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}

async function prepareMinimalUnacceptableResponse(opts: {
  supabaseUrl: string
  serviceKey: string
  usecaseId: string
  value: string
}): Promise<void> {
  const supabase = createClient(opts.supabaseUrl, opts.serviceKey, { auth: { persistSession: false } })

  const updateData: any = {
    usecase_id: opts.usecaseId,
    question_code: 'E4.N7.Q3',
    answered_by: 'validate-unacceptable-nextsteps@local',
    answered_at: new Date().toISOString(),
    single_value: opts.value,
    multiple_codes: null,
    multiple_labels: null,
    conditional_main: null,
    conditional_keys: null,
    conditional_values: null,
  }

  const { data: existing, error: existingError } = await supabase
    .from('usecase_responses')
    .select('id')
    .eq('usecase_id', opts.usecaseId)
    .eq('question_code', 'E4.N7.Q3')
    .maybeSingle()

  if (existingError) {
    const msg =
      existingError.message ||
      'Unknown error'
    throw new Error(
      `Failed to query existing usecase_responses for E4.N7.Q3 (usecase_id=${opts.usecaseId}). ` +
        `This may indicate multiple rows for the same (usecase_id, question_code) or a schema/RLS issue. ` +
        `Supabase error: ${msg}`
    )
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('usecase_responses')
      .update(updateData)
      .eq('id', existing.id)
    if (error) throw new Error(`Failed to update usecase_responses for E4.N7.Q3: ${error.message}`)
  } else {
    const { error } = await supabase.from('usecase_responses').insert(updateData)
    if (error) throw new Error(`Failed to insert usecase_responses for E4.N7.Q3: ${error.message}`)
  }
}

async function main() {
  const baseUrl = env('MAYDAI_BASE_URL')!
  const token = env('MAYDAI_REGRESSION_TOKEN')!
  const usecaseId = env('MAYDAI_USECASE_ID_UNACCEPTABLE')!
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL')!
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')!

  const prepare = toBool(env('MAYDAI_PREPARE_TEST_DATA', { optional: true }), false)

  const checks: CheckResult[] = []

  // 1) Préparation éventuelle des données test
  if (prepare) {
    try {
      await prepareMinimalUnacceptableResponse({
        supabaseUrl,
        serviceKey,
        usecaseId,
        value: 'Identification biométrique et catégorisation des personnes physiques',
      })
      checks.push({ ok: true, message: 'OK: test data prepared (usecase_responses E4.N7.Q3 updated/inserted)' })
    } catch (e) {
      checks.push({ ok: false, message: 'FAILED: test data preparation', details: e instanceof Error ? e.message : e })
    }
  } else {
    checks.push({ ok: true, message: 'OK: MAYDAI_PREPARE_TEST_DATA=false (skipping test data preparation)' })
  }

  // 2) Appel API /api/generate-report
  let apiJson: any = null
  let reportText = ''
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/generate-report`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ usecase_id: usecaseId }),
    })

    const statusLine = `HTTP ${res.status} ${res.statusText}`
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      checks.push({ ok: false, message: `FAILED: POST /api/generate-report (${statusLine})`, details: bodyText })
    } else {
      apiJson = await res.json()
      // Contract in app/api/generate-report/route.ts uses "report" as primary key.
      // Keep a conservative fallback to common alternative names if ever returned upstream.
      reportText = String(apiJson?.report ?? apiJson?.analysis ?? apiJson?.report_summary ?? '')
      checks.push({ ok: true, message: `OK: POST /api/generate-report (${statusLine})` })
    }
  } catch (e) {
    checks.push({ ok: false, message: 'FAILED: POST /api/generate-report (network/runtime error)', details: e instanceof Error ? e.message : e })
  }

  // 3) Parsing JSON du report
  let reportObj: Record<string, any> | null = null
  if (reportText) {
    reportObj = tryExtractJsonObject(reportText)
    if (reportObj) {
      checks.push({ ok: true, message: 'OK: report JSON parseable (direct or embedded)' })
    } else {
      checks.push({ ok: false, message: 'FAILED: report JSON parseable (direct or embedded)', details: truncate(reportText, 400) })
    }
  }

  // 4) Invariants “génération” sur le JSON
  if (reportObj) {
    const evaluation = reportObj.evaluation_risque
    const niveau = evaluation && typeof evaluation === 'object' && !Array.isArray(evaluation)
      ? (evaluation as any).niveau
      : undefined

    if (isNonEmptyString(niveau) && niveau === EXPECTED_RISK_LABEL_UNACCEPTABLE) {
      checks.push({ ok: true, message: `OK: evaluation_risque.niveau == "${EXPECTED_RISK_LABEL_UNACCEPTABLE}"` })
    } else {
      checks.push({
        ok: false,
        message: `FAILED: evaluation_risque.niveau == "${EXPECTED_RISK_LABEL_UNACCEPTABLE}"`,
        details: evaluation,
      })
    }

    const interdit = ['interdit_1', 'interdit_2', 'interdit_3'] as const
    const values = interdit.map((k) => reportObj?.[k])
    for (const k of interdit) {
      if (isNonEmptyString(reportObj[k])) {
        checks.push({ ok: true, message: `OK: report JSON contains non-empty ${k}` })
      } else {
        checks.push({ ok: false, message: `FAILED: report JSON contains non-empty ${k}`, details: reportObj[k] })
      }
    }
    if (values.every(isNonEmptyString)) {
      const norm = values.map((v) => normalizeLight(v))
      const distinct = new Set(norm)
      if (distinct.size === 3) {
        checks.push({ ok: true, message: 'OK: interdit_1..3 distinct after trim/normalize' })
      } else {
        checks.push({ ok: false, message: 'FAILED: interdit_1..3 distinct after trim/normalize', details: norm })
      }
    }
  }

  // 5) Extraction via le parseur du projet
  let extracted: any = null
  if (reportText) {
    try {
      extracted = extractNextStepsFromReport(reportText)
      const ok1 = isNonEmptyString(extracted?.interdit_1)
      const ok2 = isNonEmptyString(extracted?.interdit_2)
      const ok3 = isNonEmptyString(extracted?.interdit_3)
      if (ok1 && ok2 && ok3) {
        checks.push({ ok: true, message: 'OK: extractNextStepsFromReport(...) extracts interdit_1..3' })
      } else {
        checks.push({
          ok: false,
          message: 'FAILED: extractNextStepsFromReport(...) extracts interdit_1..3',
          details: { interdit_1: extracted?.interdit_1, interdit_2: extracted?.interdit_2, interdit_3: extracted?.interdit_3 },
        })
      }
    } catch (e) {
      checks.push({ ok: false, message: 'FAILED: extractNextStepsFromReport(...) threw', details: e instanceof Error ? e.message : e })
    }
  }

  // 6) Relecture DB (usecases + usecase_nextsteps)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let usecaseRow: any = null
  try {
    const { data, error } = await admin
      .from('usecases')
      .select('id, risk_level, report_summary, report_generated_at')
      .eq('id', usecaseId)
      .single()
    if (error) {
      checks.push({ ok: false, message: 'FAILED: DB read usecases', details: error.message })
    } else {
      usecaseRow = data
      if (data?.risk_level === 'unacceptable') {
        checks.push({ ok: true, message: 'OK: usecases.risk_level == unacceptable' })
      } else {
        checks.push({ ok: false, message: 'FAILED: usecases.risk_level == unacceptable', details: data?.risk_level })
      }
    }
  } catch (e) {
    checks.push({ ok: false, message: 'FAILED: DB read usecases (runtime)', details: e instanceof Error ? e.message : e })
  }

  let nextStepsRow: any = null
  try {
    const { data, error } = await admin
      .from('usecase_nextsteps')
      .select(
        [
          'usecase_id',
          'interdit_1',
          'interdit_2',
          'interdit_3',
          'quick_win_1',
          'quick_win_2',
          'quick_win_3',
          'priorite_1',
          'priorite_2',
          'priorite_3',
          'action_1',
          'action_2',
          'action_3',
          'generated_at',
          'model_version',
          'processing_time_ms',
        ].join(',')
      )
      .eq('usecase_id', usecaseId)
      .single()

    if (error) {
      checks.push({ ok: false, message: 'FAILED: DB read usecase_nextsteps', details: error.message })
    } else {
      nextStepsRow = data
      checks.push({ ok: true, message: 'OK: usecase_nextsteps row exists' })

      for (const k of ['interdit_1', 'interdit_2', 'interdit_3'] as const) {
        if (isNonEmptyString(nextStepsRow?.[k])) {
          checks.push({ ok: true, message: `OK: DB ${k} is non-empty` })
        } else {
          checks.push({ ok: false, message: `FAILED: DB ${k} is non-empty`, details: nextStepsRow?.[k] })
        }
      }

      const dbInterdits = [nextStepsRow?.interdit_1, nextStepsRow?.interdit_2, nextStepsRow?.interdit_3]
      if (dbInterdits.every(isNonEmptyString)) {
        const norm = dbInterdits.map((v) => normalizeLight(v))
        const distinct = new Set(norm)
        if (distinct.size === 3) {
          checks.push({ ok: true, message: 'OK: DB interdit_1..3 distinct after trim/normalize' })
        } else {
          checks.push({ ok: false, message: 'FAILED: DB interdit_1..3 distinct after trim/normalize', details: norm })
        }
      }

      const mustBeNull = [
        'quick_win_1',
        'quick_win_2',
        'quick_win_3',
        'priorite_1',
        'priorite_2',
        'priorite_3',
        'action_1',
        'action_2',
        'action_3',
      ] as const
      for (const k of mustBeNull) {
        if (nextStepsRow?.[k] === null) {
          checks.push({ ok: true, message: `OK: DB ${k} == null` })
        } else {
          checks.push({ ok: false, message: `FAILED: DB ${k} == null`, details: nextStepsRow?.[k] })
        }
      }
    }
  } catch (e) {
    checks.push({ ok: false, message: 'FAILED: DB read usecase_nextsteps (runtime)', details: e instanceof Error ? e.message : e })
  }

  // --- Résumé console ---
  const failed = checks.filter((c) => !c.ok)
  const passed = checks.filter((c) => c.ok)

  for (const c of passed) {
    console.log(c.message)
  }
  for (const c of failed) {
    console.error(c.message)
    if ('details' in c && c.details !== undefined) {
      console.error('  details:', typeof c.details === 'string' ? c.details : JSON.stringify(c.details, null, 2))
    }
  }

  if (failed.length === 0) {
    console.log('\nPASSED')
  } else {
    console.error('\nFAILED')
    console.error(`\nFailed checks: ${failed.length}/${checks.length}`)
    if (reportObj) {
      console.error('\nUseful excerpt: evaluation_risque + interdit_* (from report JSON)')
      console.error(
        JSON.stringify(
          {
            evaluation_risque: reportObj.evaluation_risque,
            interdit_1: reportObj.interdit_1,
            interdit_2: reportObj.interdit_2,
            interdit_3: reportObj.interdit_3,
          },
          null,
          2
        )
      )
    }
    if (nextStepsRow) {
      console.error('\nUseful excerpt: usecase_nextsteps row')
      console.error(
        JSON.stringify(
          {
            usecase_id: nextStepsRow.usecase_id,
            interdit_1: nextStepsRow.interdit_1,
            interdit_2: nextStepsRow.interdit_2,
            interdit_3: nextStepsRow.interdit_3,
            quick_win_1: nextStepsRow.quick_win_1,
            quick_win_2: nextStepsRow.quick_win_2,
            quick_win_3: nextStepsRow.quick_win_3,
            priorite_1: nextStepsRow.priorite_1,
            priorite_2: nextStepsRow.priorite_2,
            priorite_3: nextStepsRow.priorite_3,
            action_1: nextStepsRow.action_1,
            action_2: nextStepsRow.action_2,
            action_3: nextStepsRow.action_3,
            generated_at: nextStepsRow.generated_at,
            model_version: nextStepsRow.model_version,
            processing_time_ms: nextStepsRow.processing_time_ms,
          },
          null,
          2
        )
      )
    }
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('FAILED: script crashed')
  console.error(e instanceof Error ? e.stack || e.message : e)
  process.exitCode = 1
})

