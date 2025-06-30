// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email and password
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<Element>
      
      /**
       * Custom command to create a new use case
       * @example cy.createUseCase('Test Use Case', 'Description')
       */
      createUseCase(name: string, description?: string): Chainable<Element>
      
      /**
       * Custom command to answer a question in the questionnaire
       * @example cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A')
       */
      answerQuestion(questionCode: string, answerCode: string): Chainable<Element>
      
      /**
       * Custom command to verify score calculation
       * @example cy.verifyScore(95, 100)
       */
      verifyScore(expectedScore: number, maxScore: number): Chainable<Element>
      
      /**
       * Custom command to verify category scores
       * @example cy.verifyCategoryScores()
       */
      verifyCategoryScores(): Chainable<Element>
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('[data-cy=email-input]').type(email)
  cy.get('[data-cy=password-input]').type(password)
  cy.get('[data-cy=login-button]').click()
  cy.url().should('include', '/dashboard')
})

// Create use case command
Cypress.Commands.add('createUseCase', (name: string, description?: string) => {
  cy.visit('/dashboard')
  cy.get('[data-cy=create-usecase-button]').click()
  cy.get('[data-cy=usecase-name-input]').type(name)
  if (description) {
    cy.get('[data-cy=usecase-description-input]').type(description)
  }
  cy.get('[data-cy=create-usecase-submit]').click()
  cy.url().should('include', '/usecases/')
})

// Answer question command
Cypress.Commands.add('answerQuestion', (questionCode: string, answerCode: string) => {
  cy.get(`[data-cy=question-${questionCode}]`).should('be.visible')
  cy.get(`[data-cy=answer-${answerCode}]`).click()
  cy.get('[data-cy=save-answer]').click()
})

// Verify score command
Cypress.Commands.add('verifyScore', (expectedScore: number, maxScore: number) => {
  cy.get('[data-cy=total-score]').should('contain', expectedScore.toString())
  cy.get('[data-cy=max-score]').should('contain', maxScore.toString())
  
  // Verify percentage
  const percentage = Math.round((expectedScore / maxScore) * 100)
  cy.get('[data-cy=score-percentage]').should('contain', `${percentage}%`)
})

// Verify category scores command
Cypress.Commands.add('verifyCategoryScores', () => {
  const expectedCategories = [
    'transparency',
    'technical_robustness',
    'human_agency',
    'privacy_data',
    'social_environmental',
    'diversity_fairness',
    'prohibited_practices'
  ]
  
  expectedCategories.forEach(categoryId => {
    cy.get(`[data-cy=category-score-${categoryId}]`).should('be.visible')
    cy.get(`[data-cy=category-score-${categoryId}]`).within(() => {
      cy.get('[data-cy=category-name]').should('not.be.empty')
      cy.get('[data-cy=category-score]').should('not.be.empty')
      cy.get('[data-cy=category-percentage]').should('not.be.empty')
    })
  })
})

export {}