import {
  buildMonitoringAuthorizationHeader,
  isAllowedMonitoringSourceUrl,
  resolveMonitoringFetchTarget,
} from '../monitoring-source'

describe('isAllowedMonitoringSourceUrl', () => {
  test('rejects public HTTP IP origins', () => {
    expect(isAllowedMonitoringSourceUrl('http://203.0.113.10/monitoring/disk.json')).toBe(false)
    expect(isAllowedMonitoringSourceUrl('http://203.0.113.10/monitoring/docker-purges.json')).toBe(
      false
    )
  })

  test('rejects other public HTTP URLs', () => {
    expect(isAllowedMonitoringSourceUrl('http://example.com/monitoring/disk.json')).toBe(false)
  })

  test('rejects credentials embedded in the URL', () => {
    expect(
      isAllowedMonitoringSourceUrl('https://user:pass@monitoring.example.com/disk.json')
    ).toBe(false)
  })

  test('accepts HTTPS hostnames', () => {
    expect(isAllowedMonitoringSourceUrl('https://monitoring.example.com/disk.json')).toBe(true)
  })

  test('accepts loopback HTTP for localhost-only nginx', () => {
    expect(isAllowedMonitoringSourceUrl('http://127.0.0.1/monitoring/disk.json')).toBe(true)
    expect(isAllowedMonitoringSourceUrl('http://localhost/monitoring/disk.json')).toBe(true)
  })
})

describe('resolveMonitoringFetchTarget', () => {
  test('returns null when the URL env is unset', () => {
    expect(resolveMonitoringFetchTarget(undefined, {})).toBeNull()
    expect(resolveMonitoringFetchTarget('  ', {})).toBeNull()
  })

  test('refuses a public HTTP IP even if env points to it', () => {
    expect(
      resolveMonitoringFetchTarget('http://203.0.113.10/monitoring/disk.json', {
        MONITORING_HTTP_USER: 'monitoring',
        MONITORING_HTTP_PASSWORD: 'secret',
      })
    ).toBeNull()
  })

  test('refuses HTTPS without credentials', () => {
    expect(
      resolveMonitoringFetchTarget('https://monitoring.example.com/disk.json', {})
    ).toBeNull()
  })

  test('allows HTTPS with basic auth', () => {
    const target = resolveMonitoringFetchTarget('https://monitoring.example.com/disk.json', {
      MONITORING_HTTP_USER: 'monitoring',
      MONITORING_HTTP_PASSWORD: 'secret',
    })
    expect(target).toEqual({
      url: 'https://monitoring.example.com/disk.json',
      headers: {
        Authorization: `Basic ${Buffer.from('monitoring:secret', 'utf8').toString('base64')}`,
      },
    })
  })

  test('prefers a bearer token when both are set', () => {
    const header = buildMonitoringAuthorizationHeader({
      MONITORING_BEARER_TOKEN: 'tok',
      MONITORING_HTTP_USER: 'monitoring',
      MONITORING_HTTP_PASSWORD: 'secret',
    })
    expect(header).toBe('Bearer tok')
  })

  test('allows loopback HTTP without credentials', () => {
    expect(resolveMonitoringFetchTarget('http://127.0.0.1/monitoring/disk.json', {})).toEqual({
      url: 'http://127.0.0.1/monitoring/disk.json',
      headers: {},
    })
  })
})
