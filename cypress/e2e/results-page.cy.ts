describe('Results Page Functionality', () => {
  beforeEach(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'))
  })

  it('should display comprehensive results page', () => {
    const testCase = `Results Page Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter des réponses variées pour tester différentes sections
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A') // -5 points (Technical Robustness)
    cy.answerQuestion('E4.N8.Q12', 'E4.N8.Q12.A') // +10 points (Privacy & Data)
    cy.answerQuestion('E6.N10.Q1', 'E6.N10.Q1.B') // -5 points (Transparency)

    cy.get('[data-cy=view-results]').click()

    // Vérifier les éléments principaux de la page de résultats
    cy.get('[data-cy=results-page]').should('be.visible')
    cy.get('[data-cy=usecase-title]').should('contain', testCase)
    cy.get('[data-cy=usecase-description]').should('be.visible')

    // Vérifier le score global
    cy.get('[data-cy=global-score-section]').should('be.visible')
    cy.verifyScore(100, 100) // 100 - 5 + 10 - 5 = 100

    // Vérifier les scores par catégorie
    cy.get('[data-cy=category-scores-section]').should('be.visible')
    cy.verifyCategoryScores()

    // Vérifier le détail du scoring
    cy.get('[data-cy=score-breakdown-section]').should('be.visible')
    cy.get('[data-cy=score-breakdown]').should('be.visible')
  })

  it('should provide detailed category analysis', () => {
    const testCase = `Category Analysis Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter des réponses spécifiques à différentes catégories
    cy.answerQuestion('E4.N8.Q4', 'E4.N8.Q4.A') // Diversity & Fairness: -5
    cy.answerQuestion('E4.N8.Q5', 'E4.N8.Q5.A') // Diversity & Fairness: -5
    cy.answerQuestion('E5.N9.Q8', 'E5.N9.Q8.B') // Human Agency: 0

    cy.get('[data-cy=view-results]').click()

    // Vérifier l'analyse de la catégorie Diversity & Fairness
    cy.get('[data-cy=category-score-diversity_fairness]').within(() => {
      cy.get('[data-cy=category-name]').should('contain', 'Équité & Non-discrimination')
      cy.get('[data-cy=question-count]').should('contain', '2') // 2 questions répondues
      cy.get('[data-cy=category-score]').should('be.visible')
      cy.get('[data-cy=category-percentage]').should('be.visible')
      
      // Vérifier l'icône et la couleur
      cy.get('[data-cy=category-icon]').should('contain', '⚖️')
      cy.get('[data-cy=category-card]').should('have.class', 'text-amber-700')
    })

    // Vérifier l'analyse de la catégorie Human Agency
    cy.get('[data-cy=category-score-human_agency]').within(() => {
      cy.get('[data-cy=category-name]').should('contain', 'Supervision Humaine')
      cy.get('[data-cy=question-count]').should('contain', '1')
    })
  })

  it('should show risk level assessment', () => {
    const testCase = `Risk Level Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter une pratique interdite pour tester le niveau de risque élevé
    cy.answerQuestion('E4.N7.Q3', 'E4.N7.Q3.H') // Notation sociale: -50 points

    cy.get('[data-cy=view-results]').click()

    // Vérifier l'évaluation du niveau de risque
    cy.get('[data-cy=risk-assessment-section]').should('be.visible')
    cy.get('[data-cy=overall-risk-level]').should('be.visible')
    
    // Avec un score de 50/100, le niveau de risque devrait être élevé
    cy.get('[data-cy=risk-level-indicator]').should('contain', 'Élevé')
    cy.get('[data-cy=risk-level-indicator]').should('have.class', 'text-red-600')
  })

  it('should provide actionable recommendations', () => {
    const testCase = `Recommendations Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter des réponses qui génèrent des recommandations
    cy.answerQuestion('E4.N8.Q11', 'E4.N8.Q11.A') // Génération de contenu: -5
    cy.answerQuestion('E5.N9.Q4', 'E5.N9.Q4.B') // Documentation technique: -5

    cy.get('[data-cy=view-results]').click()

    // Vérifier la section des recommandations
    cy.get('[data-cy=recommendations-section]').should('be.visible')
    cy.get('[data-cy=recommendations-list]').should('be.visible')
    
    // Vérifier qu'il y a des recommandations spécifiques
    cy.get('[data-cy=recommendation-item]').should('have.length.greaterThan', 0)
    
    // Vérifier le contenu des recommandations
    cy.get('[data-cy=recommendation-item]').each($item => {
      cy.wrap($item).within(() => {
        cy.get('[data-cy=recommendation-title]').should('not.be.empty')
        cy.get('[data-cy=recommendation-description]').should('not.be.empty')
        cy.get('[data-cy=recommendation-priority]').should('be.visible')
      })
    })
  })

  it('should allow export of results', () => {
    const testCase = `Export Test ${Date.now()}`
    cy.createUseCase(testCase)

    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.B') // Réponse simple

    cy.get('[data-cy=view-results]').click()

    // Vérifier les options d'export
    cy.get('[data-cy=export-section]').should('be.visible')
    cy.get('[data-cy=export-pdf-button]').should('be.visible')
    cy.get('[data-cy=export-csv-button]').should('be.visible')
    
    // Tester l'export PDF (vérifier que le bouton est cliquable)
    cy.get('[data-cy=export-pdf-button]').should('not.be.disabled')
    
    // Tester l'export CSV
    cy.get('[data-cy=export-csv-button]').should('not.be.disabled')
  })

  it('should handle multiple use cases comparison', () => {
    // Créer plusieurs cas d'usage pour tester la comparaison
    const testCases = [
      { name: `Comparison Test A ${Date.now()}`, score: 90 },
      { name: `Comparison Test B ${Date.now()}`, score: 60 },
      { name: `Comparison Test C ${Date.now()}`, score: 85 }
    ]

    testCases.forEach((testCase, index) => {
      cy.createUseCase(testCase.name)
      
      // Ajouter des réponses pour obtenir des scores différents
      if (index === 0) {
        // Score élevé: quelques bonnes réponses
        cy.answerQuestion('E4.N8.Q12', 'E4.N8.Q12.A') // +10
      } else if (index === 1) {
        // Score moyen: quelques impacts négatifs
        cy.answerQuestion('E4.N7.Q2', 'E4.N7.Q2.A') // -30
        cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A') // -5
      } else {
        // Score correct: impact minimal
        cy.answerQuestion('E4.N8.Q2', 'E4.N8.Q2.A') // -5
      }

      cy.get('[data-cy=view-results]').click()
      cy.visit('/dashboard') // Retour au dashboard
    })

    // Vérifier la vue de comparaison sur le dashboard
    cy.get('[data-cy=usecase-list]').should('be.visible')
    cy.get('[data-cy=usecase-item]').should('have.length', 3)

    // Vérifier que les scores sont affichés correctement
    cy.get('[data-cy=usecase-item]').each($item => {
      cy.wrap($item).within(() => {
        cy.get('[data-cy=usecase-score]').should('be.visible')
        cy.get('[data-cy=usecase-status]').should('be.visible')
        cy.get('[data-cy=usecase-risk-level]').should('be.visible')
      })
    })
  })

  it('should maintain data integrity across sessions', () => {
    const testCase = `Data Integrity Test ${Date.now()}`
    cy.createUseCase(testCase)

    // Ajouter des réponses complexes
    cy.answerQuestion('E4.N8.Q12', 'E4.N8.Q12.A') // +10
    cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A') // -5

    cy.get('[data-cy=view-results]').click()

    // Capturer les données initiales
    cy.get('[data-cy=total-score]').then($score => {
      const initialScore = $score.text()
      
      // Déconnexion et reconnexion
      cy.get('[data-cy=logout-button]').click()
      cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'))
      
      // Naviguer vers le cas d'usage
      cy.get('[data-cy=usecase-list]').should('be.visible')
      cy.contains('[data-cy=usecase-item]', testCase).click()
      cy.get('[data-cy=view-results]').click()
      
      // Vérifier que les données sont préservées
      cy.get('[data-cy=total-score]').should('contain', initialScore)
    })
  })
})