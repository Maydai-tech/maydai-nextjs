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
  env: NodeJS.ProcessEnv = process.env
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
  env: NodeJS.ProcessEnv = process.env
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
