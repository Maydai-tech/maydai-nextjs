import { blankLicenseText, licenseClassFromLabel } from '../license-class'

describe('licence des poids', () => {
  test('traduit les six libellés et refuse un libellé inconnu', () => {
    expect(licenseClassFromLabel('Propriétaire')).toBe('proprietary')
    expect(licenseClassFromLabel('Poids ouverts, licence libre')).toBe('open_free')
    expect(licenseClassFromLabel('Poids ouverts, licence commerciale sous conditions')).toBe('open_conditional')
    expect(licenseClassFromLabel('Poids ouverts, licence non commerciale')).toBe('open_non_commercial')
    expect(licenseClassFromLabel('Poids ouverts, licence à qualifier')).toBe('open_to_qualify')
    expect(licenseClassFromLabel('Non renseigné')).toBe('unknown')
    expect(licenseClassFromLabel('')).toBe('empty')
    expect(licenseClassFromLabel('Open source')).toBe('invalid')
  })

  test('un tiret d’identifiant ou d’URL est vide', () => {
    expect(blankLicenseText('-')).toBeNull()
    expect(blankLicenseText('  ')).toBeNull()
    expect(blankLicenseText('apache-2.0')).toBe('apache-2.0')
  })
})
