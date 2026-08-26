/** Doit rester sous `maxDuration` de `/api/chat/generate-report` (120s), scoring inclus. */
export const REPORT_AGENT_TIMEOUT_MS = 40_000
export const REPORT_AGENT_MAX_RETRIES = 2
/** Garde-fou navigateur : un cran sous le timeout serveur pour afficher une erreur plutôt qu’un spinner infini. */
export const CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS = 100_000
