/** Modes de `evaluation_path_runs.path_mode` (analytics first-party). Distinct de `usecases.path_mode`. */

export const EVALUATION_PATH_RUN_MODES = ['short', 'long', 'assistant'] as const

export type EvaluationPathRunMode = (typeof EVALUATION_PATH_RUN_MODES)[number]

export const ASSISTANT_PATH_RUN_MODE = 'assistant' as const

export const ASSISTANT_ENTRY_SURFACE = 'chat_evaluation' as const

export function isEvaluationPathRunMode(value: unknown): value is EvaluationPathRunMode {
  return (
    typeof value === 'string' &&
    (EVALUATION_PATH_RUN_MODES as readonly string[]).includes(value)
  )
}
