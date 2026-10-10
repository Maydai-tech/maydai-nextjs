import { DEFAULT_IMPORTANCE, ProcurementInputSchema } from '../procurement'
import { parisDeadlineToUtc } from '../procurement-deadline'

const valid = { title: ' Appel ', description: ' Besoin ', phase: 'consultation', criteria_importance: DEFAULT_IMPORTANCE, custom_questions: [], deadline_at: '2099-01-15T18:00:00+01:00', supplier_emails: [' Alpha@Example.com ', 'alpha@example.com'] }
const question = { id: '72000000-0000-4000-8000-000000000001', label: 'Quel outil ?', type: 'single_choice', options: ['A', 'B'] }
test('nettoie la configuration et les emails, convertit la clôture en UTC', () => {
  expect(ProcurementInputSchema.parse(valid)).toEqual({ ...valid, title: 'Appel', description: 'Besoin', deadline_at: '2099-01-15T17:00:00.000Z', supplier_emails: ['alpha@example.com'] })
})
test.each(['title', 'description', 'phase', 'criteria_importance', 'deadline_at', 'supplier_emails'])('exige le champ %s', (key) => {
  const input: Record<string, unknown> = { ...valid }; delete input[key]
  expect(ProcurementInputSchema.safeParse(input).success).toBe(false)
})
test('accepte les bornes 0 et 10 sans supprimer de critères', () => {
  const result = ProcurementInputSchema.parse({ ...valid, criteria_importance: { ...DEFAULT_IMPORTANCE, human_oversight: 0, environment: 10 } })
  expect(result.criteria_importance.human_oversight).toBe(0)
  expect(Object.keys(result.criteria_importance)).toHaveLength(6)
})
test.each([-1, 11, 1.5, '5', NaN])('refuse une importance invalide %s', (value) => {
  expect(ProcurementInputSchema.safeParse({ ...valid, criteria_importance: { ...DEFAULT_IMPORTANCE, transparency: value } }).success).toBe(false)
})
test.each([[], ['not-an-email']].map((items) => [items]))('refuse des fournisseurs invalides', (supplier_emails) => {
  expect(ProcurementInputSchema.safeParse({ ...valid, supplier_emails }).success).toBe(false)
})
test('refuse une échéance passée', () => expect(ProcurementInputSchema.safeParse({ ...valid, deadline_at: '2000-01-01T18:00:00Z' }).success).toBe(false))
test.each([[], ['A'], ['A', ' a '], ['', 'B']].map((items) => [items]))('refuse des options invalides', (options) => {
  expect(ProcurementInputSchema.safeParse({ ...valid, custom_questions: [{ ...question, options }] }).success).toBe(false)
})
test('accepte les cinq types sans données de fichier', () => {
  for (const type of ['short_text', 'long_text', 'single_choice', 'multiple_choice', 'file']) {
    const result = ProcurementInputSchema.parse({ ...valid, custom_questions: [{ ...question, type }] })
    expect(result.custom_questions[0].type).toBe(type)
  }
})
test('accepte aucune question et refuse un intitulé vide ou un id dupliqué', () => {
  expect(ProcurementInputSchema.safeParse(valid).success).toBe(true)
  expect(ProcurementInputSchema.safeParse({ ...valid, custom_questions: [{ ...question, label: '' }] }).success).toBe(false)
  expect(ProcurementInputSchema.safeParse({ ...valid, custom_questions: [question, question] }).success).toBe(false)
})
test('convertit les horaires Paris été/hiver et refuse les dates inexistantes', () => {
  expect(parisDeadlineToUtc('2027-01-15', '18:00')).toBe('2027-01-15T17:00:00.000Z')
  expect(parisDeadlineToUtc('2027-07-15', '18:00')).toBe('2027-07-15T16:00:00.000Z')
  expect(parisDeadlineToUtc('2027-03-28', '02:30')).toBeNull()
  expect(parisDeadlineToUtc('2027-02-30', '18:00')).toBeNull()
  expect(parisDeadlineToUtc('', '')).toBeNull()
})
