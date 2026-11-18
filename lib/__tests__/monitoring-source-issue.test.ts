import { describeMonitoringSourceIssue } from '../monitoring-source'

const AUTH = { MONITORING_HTTP_USER: 'monitoring', MONITORING_HTTP_PASSWORD: 'secret' }

describe('describeMonitoringSourceIssue', () => {
  test('returns null when the source is usable', () => {
    expect(describeMonitoringSourceIssue('https://monitoring.example.com/disk.json', AUTH)).toBeNull()
    expect(describeMonitoringSourceIssue('http://127.0.0.1:8080/disk.json', {})).toBeNull()
  })

  test('reports a missing variable', () => {
    expect(describeMonitoringSourceIssue(undefined, AUTH)).toBe('variable absente')
    expect(describeMonitoringSourceIssue('  ', AUTH)).toBe('variable absente')
  })

  test('reports an invalid URL', () => {
    expect(describeMonitoringSourceIssue('not a url', AUTH)).toBe('URL invalide')
  })

  test('reports credentials embedded in the URL', () => {
    expect(describeMonitoringSourceIssue('https://u:p@monitoring.example.com/disk.json', AUTH)).toMatch(
      /identifiants dans l’URL/
    )
  })

  test('reports a public HTTP URL even with basic auth', () => {
    expect(describeMonitoringSourceIssue('http://203.0.113.10/monitoring/disk.json', AUTH)).toMatch(
      /HTTP public refusée/
    )
  })

  test('reports an unsupported protocol', () => {
    expect(describeMonitoringSourceIssue('ftp://monitoring.example.com/disk.json', AUTH)).toMatch(
      /protocole non supporté/
    )
  })

  test('reports missing authentication on HTTPS', () => {
    expect(describeMonitoringSourceIssue('https://monitoring.example.com/disk.json', {})).toMatch(
      /authentification manquante/
    )
  })

  test('never echoes the URL', () => {
    const issue = describeMonitoringSourceIssue('http://203.0.113.10/monitoring/disk.json', AUTH)
    expect(issue).not.toContain('203.0.113.10')
  })
})
