/** Agrégations purement locales pour le dashboard admin (runs court / long / assistant). */

import type { EvaluationPathRunMode } from '@/lib/evaluation-path-run-mode'

export type EvaluationPathSummary = {
  starts: number
  completions: number
  completion_rate: number | null
  mean_completion_seconds: number | null
  median_completion_seconds: number | null
}

export function medianSeconds(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  if (v.length % 2 === 1) return v[mid]
  return (v[mid - 1] + v[mid]) / 2
}

export function meanSeconds(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0)
  if (v.length === 0) return null
  return v.reduce((a, b) => a + b, 0) / v.length
}

export function completionSecondsFromTimestamps(
  startedAtIso: string,
  completedAtIso: string
): number {
  const a = new Date(startedAtIso).getTime()
  const b = new Date(completedAtIso).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0
  return Math.floor((b - a) / 1000)
}

export function summarizeEvaluationPathRuns(
  started: Array<{ path_mode: string }>,
  completed: Array<{ path_mode: string; completion_seconds: number | null }>,
  mode: EvaluationPathRunMode
): EvaluationPathSummary {
  const s = started.filter((r) => r.path_mode === mode).length
  const done = completed.filter((r) => r.path_mode === mode)
  const c = done.length
  const secs = done
    .map((r) => r.completion_seconds)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  return {
    starts: s,
    completions: c,
    completion_rate: s > 0 ? c / s : null,
    mean_completion_seconds: meanSeconds(secs),
    median_completion_seconds: medianSeconds(secs),
  }
}
