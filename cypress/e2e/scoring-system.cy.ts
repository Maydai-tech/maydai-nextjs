describe('Scoring System and Category Breakdown', () => {
  beforeEach(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'))
  })

  it('should calculate correct scores for different use case scenarios', () => {
    cy.fixture('test-scenarios').then((scenarios) => {
      scenarios.useCases.forEach((useCase: any, index: number) => {
        // Créer un nouveau cas d'usage pour chaque scénario
        const uniqueName = `${useCase.name} - Test ${Date.now()}-${index}`
        cy.createUseCase(uniqueName, useCase.description)

        // Répondre aux questions selon le scénario
        useCase.responses.forEach((response: any) => {
          if (response.single_value) {
            cy.answerQuestion(response.question_code, response.single_value)
          } else if (response.multiple_codes) {
            // Pour les réponses multiples, cliquer sur chaque option
            response.multiple_codes.forEach((code: string) => {
              cy.get(`[data-cy=answer-${code}]`).click()
            })
            cy.get('[data-cy=save-answer]').click()
          }
        })

        // Naviguer vers la page de résultats
        cy.get('[data-cy=view-results]').click()

        // Vérifier le score total
        cy.verifyScore(useCase.expectedScore, 100)

        // Vérifier les scores par catégorie
        Object.entries(useCase.expectedCategories).forEach(([categoryId, categoryData]: [string, any]) => {
          cy.get(`[data-cy=category-score-${categoryId}]`).within(() => {
            // Vérifier le nombre de questions dans cette catégorie
            if (categoryData.expectedQuestions > 0) {
              cy.get('[data-cy=question-count]')
                .should('contain', categoryData.expectedQuestions.toString())
            }

            // Vérifier que le score de catégorie est cohérent
            cy.get('[data-cy=category-score]').should('be.visible')
            cy.get('[data-cy=category-percentage]').should('be.visible')
          })
        })

        // Retourner au dashboard pour le prochain test
        cy.visit('/dashboard')
      })
    })
  })

  it('should show detailed score breakdown', () => {
    const testCase = {
      name: `Score Breakdown Test ${Date.now()}`,
      responses: [
        { question_code: 'E4.N8.Q1', answer_code: 'E4.N8.Q1.A', expectedImpact: -5 },
        { question_code: 'E4.N8.Q12', answer_code: 'E4.N8.Q12.A', expectedImpact: 10 },
        { question_code: 'E4.N7.Q3', answer_code: 'E4.N7.Q3.H', expectedImpact: -50 }
      ]
    }

    cy.createUseCase(testCase.name)

    // Répondre aux questions
    testCase.responses.forEach(response => {
      cy.answerQuestion(response.question_code, response.answer_code)
    })

    // Aller aux résultats
    cy.get('[data-cy=view-results]').click()

    // Vérifier le score total (100 - 5 + 10 - 50 = 55)
    cy.verifyScore(55, 100)

    // Vérifier le détail du breakdown
    cy.get('[data-cy=score-breakdown]').should('be.visible')
    
    testCase.responses.forEach(response => {
      cy.get(`[data-cy=breakdown-${response.question_code}]`).within(() => {
        cy.get('[data-cy=impact-value]').should('contain', response.expectedImpact.toString())
        cy.get('[data-cy=question-text]').should('be.visible')
        cy.get('[data-cy=answer-value]').should('be.visible')
      })
    })
  })

  it('should validate category weight distribution', () => {
    const testCase = `Category Weights Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter quelques réponses pour avoir des données
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.B') // Technical Robustness: 0 impact
    cy.answerQuestion('E6.N10.Q1', 'E6.N10.Q1.A') // Transparency: 0 impact

    cy.get('[data-cy=view-results]').click()

    // Vérifier que toutes les catégories sont présentes
    const expectedCategories = [
      { id: 'transparency', weight: 15 },
      { id: 'technical_robustness', weight: 20 },
      { id: 'human_agency', weight: 18 },
      { id: 'privacy_data', weight: 17 },
      { id: 'social_environmental', weight: 10 },
      { id: 'diversity_fairness', weight: 15 },
      { id: 'prohibited_practices', weight: 5 }
    ]

    expectedCategories.forEach(category => {
      cy.get(`[data-cy=category-score-${category.id}]`).should('be.visible')
      cy.get(`[data-cy=category-score-${category.id}]`).within(() => {
        // Vérifier que le score max correspond au poids de la catégorie
        cy.get('[data-cy=category-max-score]')
          .should('contain', (100 * category.weight / 100).toString())
      })
    })

    // Vérifier que la somme des poids fait 100%
    let totalWeight = 0
    expectedCategories.forEach(category => {
      totalWeight += category.weight
    })
    expect(totalWeight).to.equal(100)
  })

  it('should handle edge cases in scoring', () => {
    // Test avec score minimum (beaucoup d'impacts négatifs)
    const minScoreTest = `Min Score Test ${Date.now()}`
    cy.createUseCase(minScoreTest)

    // Ajouter plusieurs impacts négatifs
    cy.answerQuestion('E4.N7.Q3', 'E4.N7.Q3.H') // -50 points
    cy.answerQuestion('E4.N7.Q2', 'E4.N7.Q2.A') // -30 points
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A') // -5 points

    cy.get('[data-cy=view-results]').click()

    // Score devrait être 100 - 50 - 30 - 5 = 15
    cy.verifyScore(15, 100)

    // Vérifier que le score ne peut pas être négatif
    cy.get('[data-cy=total-score]').should('not.contain', '-')
  })

  it('should show consistent results across page refreshes', () => {
    const consistencyTest = `Consistency Test ${Date.now()}`
    cy.createUseCase(consistencyTest)

    // Ajouter des réponses
    cy.answerQuestion('E4.N8.Q12', 'E4.N8.Q12.A') // +10 points
    cy.answerQuestion('E4.N8.Q2', 'E4.N8.Q2.A') // -5 points

    cy.get('[data-cy=view-results]').click()

    // Capturer le score initial
    cy.get('[data-cy=total-score]').then($score => {
      const initialScore = $score.text()

      // Rafraîchir la page
      cy.reload()

      // Vérifier que le score est identique
      cy.get('[data-cy=total-score]').should('contain', initialScore)
    })
  })
})