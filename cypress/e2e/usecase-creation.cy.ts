describe('Use Case Creation', () => {
  beforeEach(() => {
    // Login avant chaque test
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'))
  })

  it('should create a new use case successfully', () => {
    const useCaseName = `Test Use Case ${Date.now()}`
    const useCaseDescription = 'Description automatisée pour les tests E2E'

    // Créer un nouveau cas d'usage
    cy.createUseCase(useCaseName, useCaseDescription)

    // Vérifier que nous sommes sur la page du cas d'usage
    cy.url().should('include', '/usecases/')
    cy.get('[data-cy=usecase-title]').should('contain', useCaseName)
    
    // Vérifier que le questionnaire est accessible
    cy.get('[data-cy=questionnaire-section]').should('be.visible')
  })

  it('should navigate through different sections of the questionnaire', () => {
    const useCaseName = `Navigation Test ${Date.now()}`
    
    cy.createUseCase(useCaseName)

    // Vérifier les sections principales du questionnaire
    const sections = [
      'Identification du Système',
      'Classification du Risque',
      'Évaluation Détaillée'
    ]

    sections.forEach(sectionName => {
      cy.get(`[data-cy=section-${sectionName.toLowerCase().replace(/\s+/g, '-')}]`)
        .should('be.visible')
    })
  })

  it('should save use case in draft status', () => {
    const useCaseName = `Draft Test ${Date.now()}`
    
    cy.createUseCase(useCaseName)

    // Vérifier le statut initial
    cy.get('[data-cy=usecase-status]').should('contain', 'draft')
    
    // Ajouter une réponse simple
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.B')
    
    // Vérifier que le statut passe à "in_progress"
    cy.get('[data-cy=usecase-status]').should('contain', 'in_progress')
  })

  it('should validate required fields', () => {
    cy.visit('/dashboard')
    cy.get('[data-cy=create-usecase-button]').click()
    
    // Essayer de créer sans nom
    cy.get('[data-cy=create-usecase-submit]').click()
    
    // Vérifier l'erreur de validation
    cy.get('[data-cy=name-error]').should('be.visible')
    cy.get('[data-cy=name-error]').should('contain', 'requis')
  })
})