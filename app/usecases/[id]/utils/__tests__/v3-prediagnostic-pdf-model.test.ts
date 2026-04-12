import { buildV3PrediagnosticPdfModel } from '../v3-prediagnostic-pdf-model'

describe('buildV3PrediagnosticPdfModel', () => {
  it('produit un modèle avec qualification, risque et liens absolus', () => {
    const model = buildV3PrediagnosticPdfModel({
      useCaseId: 'uc-1',
      useCaseName: 'Mon cas',
      companyId: 'co-1',
      companyName: 'ACME',
      systemType: 'Produit',
      answers: {},
      baseUrl: 'https://app.test',
    })
    expect(model.useCaseName).toBe('Mon cas')
    expect(model.companyName).toBe('ACME')
    expect(model.qualificationLine.length).toBeGreaterThan(5)
    expect(model.riskLine.length).toBeGreaterThan(3)
    expect(model.implications.length).toBeGreaterThanOrEqual(1)
    expect(model.establishedCore.length).toBeGreaterThanOrEqual(3)
    expect(model.remainingItems.length).toBeGreaterThanOrEqual(4)
    expect(model.links.some((l) => l.href.includes('/usecases/uc-1/evaluation'))).toBe(true)
    expect(model.links.some((l) => l.href.includes('todo-list'))).toBe(true)
    expect(model.disclaimer).toMatch(/pré-diagnostic|audit/i)
    expect(model.notRapportCompletNote).toMatch(/rapport complet|parcours long/i)
  })

  it('sans baseUrl, les liens sont vides', () => {
    const model = buildV3PrediagnosticPdfModel({
      useCaseId: 'uc-1',
      useCaseName: 'X',
      companyId: 'co-1',
      answers: {},
      baseUrl: '',
    })
    expect(model.links).toEqual([])
  })
})
