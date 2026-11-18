import { buildMonitoringChecks, type MonitoringChecksInput } from '../checks'

const base: MonitoringChecksInput = {
  usePercent: 22,
  diskError: null,
  email: null,
  emailError: null,
  purges: [],
  purgesError: null,
  formatDate: (iso) => `D(${iso})`,
}

const byKey = (input: Partial<MonitoringChecksInput>) =>
  Object.fromEntries(buildMonitoringChecks({ ...base, ...input }).map((c) => [c.key, c]))

describe('buildMonitoringChecks', () => {
  test('returns the four cards in a stable order', () => {
    expect(buildMonitoringChecks(base).map((c) => c.key)).toEqual(['disk-alert', 'email', 'logs', 'docker'])
  })

  describe('disk alert', () => {
    test('below threshold', () => {
      expect(byKey({ usePercent: 22 })['disk-alert']).toMatchObject({ value: 'Sous le seuil', tone: 'ok' })
    })
    test('at or above 85 %', () => {
      expect(byKey({ usePercent: 85 })['disk-alert']).toMatchObject({ value: 'Seuil dépassé', tone: 'warn' })
    })
    test('unknown disk shows the API error', () => {
      expect(byKey({ usePercent: null, diskError: 'Source monitoring non configurée' })['disk-alert']).toMatchObject({
        value: 'Indisponible',
        details: 'Source monitoring non configurée',
      })
    })
  })

  describe('email', () => {
    test('no alert sent yet', () => {
      expect(byKey({}).email).toMatchObject({ value: 'Aucune alerte', tone: 'ok' })
    })
    test('last alert sent', () => {
      const card = byKey({ email: { recipient: 'ops@example.com', lastSentAt: '2026-11-01T10:00:00Z' } }).email
      expect(card).toMatchObject({ value: 'Alerte envoyée', tone: 'info' })
      expect(card.details).toContain('D(2026-11-01T10:00:00Z)')
      expect(card.details).toContain('ops@example.com')
    })
    test('source error', () => {
      expect(byKey({ emailError: 'Source statut email indisponible (500)' }).email).toMatchObject({
        value: 'Indisponible',
        details: 'Source statut email indisponible (500)',
      })
    })
  })

  test('log rotation is reported as not tracked, never as active', () => {
    expect(byKey({}).logs).toMatchObject({ value: 'Non suivie', tone: 'muted' })
  })

  describe('docker cleanup', () => {
    const purge = (ranAt: string, exitCode = 0, errorMessage: string | null = null) => ({
      ranAt,
      totalReclaimedBytes: 2_000_000_000,
      exitCode,
      errorMessage,
    })

    test('no purge yet', () => {
      expect(byKey({}).docker).toMatchObject({ value: 'Aucune purge' })
    })
    test('uses the most recent purge', () => {
      const card = byKey({ purges: [purge('2026-11-02T03:00:00Z'), purge('2026-11-09T03:00:00Z')] }).docker
      expect(card).toMatchObject({ value: 'OK', tone: 'ok' })
      expect(card.details).toContain('D(2026-11-09T03:00:00Z)')
      expect(card.details).toContain('2,0 Go')
    })
    test('failed last purge', () => {
      const card = byKey({ purges: [purge('2026-11-09T03:00:00Z', 1, 'docker down')] }).docker
      expect(card).toMatchObject({ value: 'Dernière purge en échec', tone: 'warn' })
      expect(card.details).toContain('docker down')
    })
    test('source error', () => {
      expect(byKey({ purgesError: 'Source purges Docker indisponible (404)' }).docker).toMatchObject({
        value: 'Indisponible',
      })
    })
  })
})
