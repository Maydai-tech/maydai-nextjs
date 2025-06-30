describe('Integration Tests - Complete User Journey', () => {
  beforeEach(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'))
  })

  it('should complete a full evaluation workflow', () => {
    cy.fixture('test-scenarios').then((scenarios) => {
      const scenario = scenarios.useCases[0] // Chatbot Client Service
      const testName = `Full Workflow ${Date.now()}`

      // 1. Créer le cas d'usage
      cy.createUseCase(testName, scenario.description)

      // 2. Remplir le questionnaire section par section
      cy.get('[data-cy=questionnaire-section]').should('be.visible')

      // Classification initiale
      cy.get('[data-cy=classification-section]').within(() => {
        cy.get('[data-cy=risk-level-select]').select('limited')
        cy.get('[data-cy=ai-category-select]').select('customer-service')
        cy.get('[data-cy=system-type-select]').select('chatbot')
      })

      // Répondre aux questions d'évaluation
      scenario.responses.forEach((response: any) => {
        cy.answerQuestion(response.question_code, response.single_value)
      })

      // 3. Vérifier le statut "completed"
      cy.get('[data-cy=complete-evaluation]').click()
      cy.get('[data-cy=usecase-status]').should('contain', 'completed')

      // 4. Consulter les résultats
      cy.get('[data-cy=view-results]').click()

      // 5. Vérifier tous les éléments des résultats
      cy.verifyScore(scenario.expectedScore, 100)
      cy.verifyCategoryScores()

      // 6. Vérifier le détail par catégorie
      Object.entries(scenario.expectedCategories).forEach(([categoryId, data]: [string, any]) => {
        cy.get(`[data-cy=category-score-${categoryId}]`).should('be.visible')
      })

      // 7. Tester l'export
      cy.get('[data-cy=export-pdf-button]').should('be.visible')

      // 8. Retourner au dashboard et vérifier la liste
      cy.visit('/dashboard')
      cy.get('[data-cy=usecase-list]').should('contain', testName)
    })
  })

  it('should handle concurrent use case evaluations', () => {
    const testCases = [
      { name: `Concurrent Test A ${Date.now()}`, answers: ['E4.N8.Q1.A', 'E4.N8.Q2.B'] },
      { name: `Concurrent Test B ${Date.now()}`, answers: ['E4.N8.Q12.A', 'E6.N10.Q1.A'] },
      { name: `Concurrent Test C ${Date.now()}`, answers: ['E4.N7.Q3.H'] }
    ]

    // Créer plusieurs cas d'usage rapidement
    testCases.forEach(testCase => {
      cy.createUseCase(testCase.name)
      
      // Ajouter quelques réponses
      testCase.answers.forEach((answer, index) => {
        const questionCode = answer.substring(0, answer.lastIndexOf('.'))
        cy.answerQuestion(questionCode, answer)
      })

      cy.visit('/dashboard')
    })

    // Vérifier que tous les cas d'usage sont créés
    cy.get('[data-cy=usecase-list]').should('be.visible')
    testCases.forEach(testCase => {
      cy.get('[data-cy=usecase-list]').should('contain', testCase.name)
    })

    // Vérifier les scores de chaque cas d'usage
    testCases.forEach(testCase => {
      cy.contains('[data-cy=usecase-item]', testCase.name).within(() => {
        cy.get('[data-cy=usecase-score]').should('be.visible')
        cy.get('[data-cy=usecase-score]').should('not.contain', 'NaN')
        cy.get('[data-cy=usecase-score]').should('not.contain', 'undefined')
      })
    })
  })

  it('should validate score calculation consistency', () => {
    const testCase = `Consistency Validation ${Date.now()}`
    cy.createUseCase(testCase)

    // Scénario de test avec calculs connus
    const responses = [
      { question: 'E4.N8.Q1', answer: 'E4.N8.Q1.A', impact: -5 },
      { question: 'E4.N8.Q12', answer: 'E4.N8.Q12.A', impact: 10 },
      { question: 'E4.N7.Q3', answer: 'E4.N7.Q3.I', impact: 0 },
      { question: 'E6.N10.Q1', answer: 'E6.N10.Q1.B', impact: -5 }
    ]

    let expectedScore = 100
    responses.forEach(response => {
      cy.answerQuestion(response.question, response.answer)
      expectedScore += response.impact
    })

    // Calculer le score attendu: 100 - 5 + 10 + 0 - 5 = 100
    cy.get('[data-cy=view-results]').click()
    cy.verifyScore(100, 100)

    // Vérifier le breakdown détaillé
    cy.get('[data-cy=score-breakdown]').should('be.visible')
    responses.forEach(response => {
      if (response.impact !== 0) {
        cy.get(`[data-cy=breakdown-${response.question}]`).should('be.visible')
        cy.get(`[data-cy=breakdown-${response.question}]`).within(() => {
          cy.get('[data-cy=impact-value]').should('contain', response.impact.toString())
        })
      }
    })
  })

  it('should handle edge cases and error scenarios', () => {
    const testCase = `Edge Cases Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Test avec score minimum possible
    cy.answerQuestion('E4.N7.Q3', 'E4.N7.Q3.H') // -50
    cy.answerQuestion('E4.N7.Q2', 'E4.N7.Q2.A') // -30
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A') // -5
    cy.answerQuestion('E4.N8.Q2', 'E4.N8.Q2.A') // -5
    cy.answerQuestion('E4.N8.Q3', 'E4.N8.Q3.A') // -5
    cy.answerQuestion('E4.N8.Q4', 'E4.N8.Q4.A') // -5

    cy.get('[data-cy=view-results]').click()

    // Score attendu: 100 - 50 - 30 - 5 - 5 - 5 - 5 = 0 (mais minimum 0)
    cy.get('[data-cy=total-score]').should('be.visible')
    cy.get('[data-cy=total-score]').should('not.contain', '-') // Pas de score négatif
    
    // Vérifier que toutes les catégories ont des scores >= 0
    cy.get('[data-cy=category-score]').each($score => {
      const scoreText = $score.text()
      const scoreValue = parseInt(scoreText.match(/\d+/)?.[0] || '0')
      expect(scoreValue).to.be.at.least(0)
    })
  })

  it('should support questionnaire navigation and progress tracking', () => {
    const testCase = `Navigation Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Vérifier la navigation par étapes
    cy.get('[data-cy=step-navigation]').should('be.visible')
    
    // Vérifier le progrès initial
    cy.get('[data-cy=progress-indicator]').should('contain', '0%')

    // Répondre à quelques questions
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.B')
    cy.answerQuestion('E4.N8.Q2', 'E4.N8.Q2.B')

    // Vérifier que le progrès augmente
    cy.get('[data-cy=progress-indicator]').should('not.contain', '0%')

    // Tester la navigation entre les sections
    cy.get('[data-cy=next-section]').click()
    cy.get('[data-cy=previous-section]').click()

    // Vérifier la sauvegarde automatique
    cy.reload()
    cy.get('[data-cy=progress-indicator]').should('not.contain', '0%')
  })

  it('should provide accurate compliance assessment', () => {
    cy.fixture('test-scenarios').then((scenarios) => {
      scenarios.useCases.forEach((scenario: any, index: number) => {
        const testName = `Compliance Assessment ${index} ${Date.now()}`
        
        cy.createUseCase(testName, scenario.description)

        // Répondre selon le scénario
        scenario.responses.forEach((response: any) => {
          if (response.single_value) {
            cy.answerQuestion(response.question_code, response.single_value)
          }
        })

        cy.get('[data-cy=view-results]').click()

        // Vérifier l'évaluation de conformité
        cy.get('[data-cy=compliance-assessment]').should('be.visible')
        
        // Vérifier le niveau de risque attendu
        if (scenario.expectedRiskLevel === 'prohibited') {
          cy.get('[data-cy=risk-level-indicator]').should('contain', 'Interdit')
          cy.get('[data-cy=compliance-status]').should('contain', 'Non conforme')
        } else if (scenario.expectedRiskLevel === 'high') {
          cy.get('[data-cy=risk-level-indicator]').should('contain', 'Élevé')
        } else if (scenario.expectedRiskLevel === 'limited') {
          cy.get('[data-cy=risk-level-indicator]').should('contain', 'Limité')
        }

        // Vérifier les recommandations spécifiques
        cy.get('[data-cy=recommendations-section]').should('be.visible')
        
        cy.visit('/dashboard')
      })
    })
  })
})