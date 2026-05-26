import { normalizeGoogleAdsClickId } from '@/lib/google-ads/click-id'

describe('normalizeGoogleAdsClickId', () => {
  test('trim et conserve un gclid valide', () => {
    expect(normalizeGoogleAdsClickId('  abc123  ')).toBe('abc123')
  })

  test('retourne null si vide', () => {
    expect(normalizeGoogleAdsClickId('   ')).toBeNull()
    expect(normalizeGoogleAdsClickId('')).toBeNull()
  })
})
