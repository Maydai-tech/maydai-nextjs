import { shouldShowEuLicenseAlert } from '../eu-license-alert'

describe('alerte Exclusion UE', () => {
  test('l’alerte s’affiche pour un modèle restreint', () => {
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: 'France',
    })).toBe(true)
  })

  test('elle ne s’affiche pas pour un modèle non restreint', () => {
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: false,
      organizationCountry: 'France',
    })).toBe(false)
  })

  test('un pays renseigné hors de l’UE masque l’alerte', () => {
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: 'États-Unis',
    })).toBe(false)
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: 'United States',
    })).toBe(false)
  })

  test('pays vide → alerte affichée', () => {
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: '',
    })).toBe(true)
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: null,
    })).toBe(true)
  })

  test('un pays illisible affiche l’alerte', () => {
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: 'fzefef',
    })).toBe(true)
    expect(shouldShowEuLicenseAlert({
      licenseEuRestricted: true,
      organizationCountry: 'United States of Merica',
    })).toBe(true)
  })
})
