// Type definitions for Cypress custom commands

/// <reference types="cypress" />

declare namespace Cypress {
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