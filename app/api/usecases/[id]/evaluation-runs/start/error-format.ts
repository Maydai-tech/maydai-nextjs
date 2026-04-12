export type PostgrestErrorParts = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

export type EvaluationRunStartErrorStep =
  | 'open_run_select'
  | 'insert_run'
  | 'service_role_probe'
  | 'unexpected'

const RAW_PREVIEW_MAX = 2000

function constructorNameOf(value: unknown): string {
  if (value === null) return 'Null'
  if (value === undefined) return 'Undefined'
  if (typeof value !== 'object') return typeof value
  try {
    const c = (value as { constructor?: { name?: string } }).constructor
    const n = c?.name
    return typeof n === 'string' && n.length > 0 ? n : 'Object'
  } catch {
    return 'Object'
  }
}

function keysSummary(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  try {
    return Object.keys(value as object).join(',')
  } catch {
    return ''
  }
}

/** Sérialisation stable pour logs / JSON (pas de throw). */
export function safeSerializeUnknown(value: unknown, maxLen: number = RAW_PREVIEW_MAX): string {
  try {
    if (value instanceof Error) {
      const o = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
      const s = JSON.stringify(o)
      return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
    }
    if (typeof value === 'string') {
      return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value
    }
    const seen = new WeakSet<object>()
    const s = JSON.stringify(value, (_k, v) => {
      if (typeof v === 'bigint') return String(v)
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]'
        seen.add(v)
      }
      return v
    })
    if (typeof s !== 'string') return String(value)
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
  } catch {
    try {
      return String(value)
    } catch {
      return '[unserializable]'
    }
  }
}

function pickLooseMessage(o: Record<string, unknown>): string | undefined {
  const keys = ['message', 'msg', 'error', 'error_description', 'description', 'statusText'] as const
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim().length > 0) return v
    if (v != null && typeof v !== 'object' && String(v).length > 0) return String(v)
  }
  return undefined
}

export function extractPostgrestParts(err: unknown): PostgrestErrorParts {
  if (!err || typeof err !== 'object' || Array.isArray(err)) return {}
  const o = err as Record<string, unknown>
  const loose = pickLooseMessage(o)
  const messageFromMessage =
    typeof o.message === 'string'
      ? o.message
      : o.message != null && typeof o.message !== 'object'
        ? String(o.message)
        : undefined
  return {
    message: messageFromMessage ?? loose,
    code: typeof o.code === 'string' ? o.code : o.code != null ? String(o.code) : undefined,
    details:
      o.details != null
        ? typeof o.details === 'object'
          ? JSON.stringify(o.details)
          : String(o.details)
        : undefined,
    hint: typeof o.hint === 'string' ? o.hint : o.hint != null ? String(o.hint) : undefined,
  }
}

export function primaryErrorLine(parts: PostgrestErrorParts, fallback: unknown): string {
  const line = [parts.message, parts.code, parts.details, parts.hint]
    .filter((x) => x != null && String(x).length > 0)
    .join(' | ')
  if (line.length > 0) return line
  if (fallback instanceof Error && fallback.message) return fallback.message
  if (typeof fallback === 'string' && fallback.length > 0) return fallback
  if (fallback != null && typeof fallback === 'object') {
    const keys = keysSummary(fallback)
    const s = safeSerializeUnknown(fallback, 500)
    if (s === '{}' || s === '[]') {
      return keys.length > 0
        ? `Erreur sans message exploitable (objet vide apparent, clés: ${keys})`
        : 'Erreur sans message exploitable (objet vide)'
    }
    if (s !== 'null') return s.length > 500 ? `${s.slice(0, 500)}…` : s
  }
  if (fallback != null) {
    try {
      const s = JSON.stringify(fallback)
      if (s === '{}' || s === '[]' || s === 'null') {
        return `Erreur non sérialisable standard (type: ${constructorNameOf(fallback)})`
      }
      return s.length > 500 ? `${s.slice(0, 500)}…` : s
    } catch {
      return String(fallback)
    }
  }
  return 'Erreur inconnue (valeur null/undefined)'
}

export function logEvaluationRunStartError(
  step: EvaluationRunStartErrorStep,
  ctx: { useCaseId: string; pathMode: string },
  err: unknown
) {
  const parts = extractPostgrestParts(err)
  const errorKeys = keysSummary(err)
  const ctor = constructorNameOf(err)
  const typ = err === null ? 'null' : err === undefined ? 'undefined' : typeof err
  const serialized = safeSerializeUnknown(err, RAW_PREVIEW_MAX)
  console.error('[evaluation-runs/start]', {
    step,
    useCaseId: ctx.useCaseId,
    pathMode: ctx.pathMode,
    constructorName: ctor,
    typeof: typ,
    error_keys: errorKeys.length > 0 ? errorKeys : null,
    code: parts.code ?? null,
    message: parts.message ?? null,
    details: parts.details ?? null,
    hint: parts.hint ?? null,
    serialized,
    raw: err,
  })
}

export function errorResponseBody(
  err: unknown,
  step?: EvaluationRunStartErrorStep
): Record<string, string> {
  const parts = extractPostgrestParts(err)
  const error = primaryErrorLine(parts, err)
  const ctor = constructorNameOf(err)
  const keys = keysSummary(err)
  const body: Record<string, string> = {
    error,
    error_type: ctor,
    error_keys: keys.length > 0 ? keys : '(none)',
    raw_preview: safeSerializeUnknown(err, RAW_PREVIEW_MAX),
  }
  if (step) body.step = step
  if (parts.code) body.code = parts.code
  if (parts.details) body.details = parts.details
  if (parts.hint) body.hint = parts.hint
  return body
}
