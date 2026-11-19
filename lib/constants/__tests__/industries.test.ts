import {
  getIndustryDisplayText,
  getSubCategoryById,
  isValidSubCategoryId,
} from '@/lib/constants/industries'
import { validateIndustrySelection } from '@/lib/validation/industries'

describe('INDUSTRIES_LIST — Services notariaux', () => {
  test('expose la sous-catégorie sous Services aux Entreprises & Juridique', () => {
    const subCategory = getSubCategoryById('services', 'notarial')

    expect(subCategory).toEqual({ id: 'notarial', label: 'Services notariaux' })
    expect(isValidSubCategoryId('services', 'notarial')).toBe(true)
    expect(getIndustryDisplayText('services', 'notarial')).toBe(
      'Services aux Entreprises & Juridique > Services notariaux'
    )
  })

  test('accepte le couple secteur / sous-catégorie à la validation', () => {
    expect(validateIndustrySelection('services', 'notarial')).toEqual({ valid: true })
  })
})
