/**
 * Sources JSON de monitoring hôte (disque, email, purges Docker).
 *
 * Ces fichiers ne doivent jamais être lus via une origine HTTP publique
 * (IP brute, :80 anonyme). L’API admin n’accepte que :
 * - http(s) loopback (nginx restreint à localhost)
 * - https + en-tête d’authentification (basic auth ou bearer)
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export type MonitoringFetchTarget = {
  url: string
  headers: Record<string, string>
}

export type MonitoringEnv = {
  MONITORING_BEARER_TOKEN?: string
  MONITORING_HTTP_USER?: string
  MONITORING_HTTP_PASSWORD?: string
  [key: string]: string | undefined
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.replace(/^\[|\]$/g, '').toLowerCase())
}

export function isAllowedMonitoringSourceUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }

  if (url.username || url.password) {
    return false
  }

  const host = hostnameOf(url)
  if (url.protocol === 'https:') {
    return host.length > 0
  }

  if (url.protocol === 'http:') {
    return isLoopbackHostname(host)
  }

  return false
}

export function buildMonitoringAuthorizationHeader(
  env: MonitoringEnv = process.env
): string | null {
  const bearer = env.MONITORING_BEARER_TOKEN?.trim()
  if (bearer) {
    return `Bearer ${bearer}`
  }

  const user = env.MONITORING_HTTP_USER?.trim()
  const password = env.MONITORING_HTTP_PASSWORD
  if (user && typeof password === 'string' && password.length > 0) {
    return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`
  }

  return null
}

export function resolveMonitoringFetchTarget(
  rawUrl: string | undefined,
  env: MonitoringEnv = process.env
): MonitoringFetchTarget | null {
  const value = rawUrl?.trim()
  if (!value || !isAllowedMonitoringSourceUrl(value)) {
    return null
  }

  const url = new URL(value)
  const authorization = buildMonitoringAuthorizationHeader(env)
  const loopback = isLoopbackHostname(hostnameOf(url))

  if (!loopback && !authorization) {
    return null
  }

  const headers: Record<string, string> = {}
  if (authorization) {
    headers.Authorization = authorization
  }

  return { url: value, headers }
}

/**
 * Raison lisible pour laquelle `resolveMonitoringFetchTarget` refuse une source
 * (null si la source est utilisable). Ne renvoie jamais l’URL ni les secrets.
 */
export function describeMonitoringSourceIssue(
  rawUrl: string | undefined,
  env: MonitoringEnv = process.env
): string | null {
  if (resolveMonitoringFetchTarget(rawUrl, env)) {
    return null
  }

  const value = rawUrl?.trim()
  if (!value) {
    return 'variable absente'
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'URL invalide'
  }

  if (url.username || url.password) {
    return 'identifiants dans l’URL refusés (utiliser MONITORING_HTTP_USER / MONITORING_HTTP_PASSWORD)'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'protocole non supporté (HTTPS attendu)'
  }
  if (url.protocol === 'http:') {
    return 'URL en HTTP public refusée (HTTPS requis)'
  }
  return 'authentification manquante (MONITORING_HTTP_USER + MONITORING_HTTP_PASSWORD ou MONITORING_BEARER_TOKEN)'
}
