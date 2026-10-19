import { mergeCompleteSignupProfile, emptySignupProfileFields } from '../signup'

describe('mergeCompleteSignupProfile', () => {
  const existing = {
    first_name: 'Marie',
    last_name: 'Dupont',
    company_name: 'Acme',
    industry: 'tech_data',
    sub_category_id: 'saas',
    phone: '0612345678',
    siren: '732829320',
    gclid: 'old-gclid',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'brand',
  }

  test('un payload d’inscription sans phone/siren ne les efface pas', () => {
    const merged = mergeCompleteSignupProfile(existing, {
      first_name: 'Marie',
      last_name: 'Dupont',
      company_name: 'Learning Gate Partner',
      industry: 'tech_data',
      sub_category_id: 'saas',
      utm_source: 'learning_gate',
      utm_medium: 'partenariat',
    })

    expect(merged.phone).toBe('0612345678')
    expect(merged.siren).toBe('732829320')
    expect(merged.gclid).toBe('old-gclid')
    expect(merged.utm_campaign).toBe('brand')
    expect(merged.company_name).toBe('Learning Gate Partner')
    expect(merged.utm_source).toBe('learning_gate')
  })

  test('un nouveau profil (aucune ligne) garde les champs omis à null', () => {
    const merged = mergeCompleteSignupProfile(null, {
      first_name: 'ArchitecteTest',
    })

    expect(merged).toEqual({
      ...emptySignupProfileFields(),
      first_name: 'ArchitecteTest',
    })
  })

  test('un champ envoyé explicitement à null écrase la valeur existante', () => {
    const merged = mergeCompleteSignupProfile(existing, { siren: null, phone: null })
    expect(merged.siren).toBeNull()
    expect(merged.phone).toBeNull()
    expect(merged.first_name).toBe('Marie')
  })
})
