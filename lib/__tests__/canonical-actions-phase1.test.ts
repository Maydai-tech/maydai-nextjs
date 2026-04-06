import {
  getAcceptedDossierApiDocTypeParams,
  normalizeHumanOversightFormData,
  resolveLegacyDocTypeAlias,
} from '@/lib/canonical-actions'

describe('canonical-actions phase 1 — alias & API', () => {
  test('resolveLegacyDocTypeAlias aligné sur les alias prioritaires', () => {
    expect(resolveLegacyDocTypeAlias('registry_action')).toBe('registry_proof')
    expect(resolveLegacyDocTypeAlias('training_census')).toBe('training_plan')
    expect(resolveLegacyDocTypeAlias('registry_proof')).toBe('registry_proof')
  })

  test('getAcceptedDossierApiDocTypeParams inclut canoniques + clés alias', () => {
    const s = getAcceptedDossierApiDocTypeParams()
    expect(s.has('registry_proof')).toBe(true)
    expect(s.has('registry_action')).toBe(true)
    expect(s.has('training_plan')).toBe(true)
    expect(s.has('training_census')).toBe(true)
  })
})

describe('normalizeHumanOversightFormData', () => {
  test('accepte snake_case et camelCase', () => {
    expect(
      normalizeHumanOversightFormData({
        supervisor_name: 'A',
        supervisor_role: 'B',
        supervisor_email: 'c@x.fr',
      })
    ).toEqual({
      supervisorName: 'A',
      supervisorRole: 'B',
      supervisorEmail: 'c@x.fr',
    })
    expect(
      normalizeHumanOversightFormData({
        supervisorName: 'A',
        supervisorRole: 'B',
        supervisorEmail: 'c@x.fr',
      })
    ).toEqual({
      supervisorName: 'A',
      supervisorRole: 'B',
      supervisorEmail: 'c@x.fr',
    })
  })
})
