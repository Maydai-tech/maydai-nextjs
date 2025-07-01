// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests in Cypress Command Log
Cypress.on('window:before:load', (win) => {
  // Stub fetch to avoid network requests during tests
  cy.stub(win, 'fetch').as('fetch')
})

// Global configuration
Cypress.config('defaultCommandTimeout', 10000)
Cypress.config('requestTimeout', 10000)
Cypress.config('responseTimeout', 10000)

// Ignore uncaught exceptions from cross-origin scripts
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore cross-origin script errors during tests
  if (err.message.includes('Script error')) {
    return false
  }
  // Let other errors fail the test
  return true
})