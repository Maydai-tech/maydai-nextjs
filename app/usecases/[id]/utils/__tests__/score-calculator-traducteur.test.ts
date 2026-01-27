/**
 * Tests de validation basés sur les cas "Traducteur page HTML 1" et "Traducteur page HTML 2"
 * de la grille de scoring CSV.
 *
 * Ces tests vérifient que le calcul de score avec les nouveaux impacts
 * correspond aux valeurs attendues du CSV.
 */

// Mock Supabase avant les imports pour éviter l'erreur de variables d'environnement
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    }
  },
  createSupabaseClient: jest.fn()
}))

import { calculateScore } from '../score-calculator'

describe('Score Calculator - Cas Traducteur (validation CSV)', () => {
  const mockUsecaseId = 'test-traducteur-usecase'

  /**
   * Réponses du cas "Traducteur page HTML 1" - Toutes réponses positives
   * Selon le CSV, ce cas a toutes les bonnes réponses (OUI, < 100, texte, etc.)
   */
  const traducteur1Responses = [
    // E4.N7.Q1 - Situation (User)
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    // E4.N7.Q2 - Domaines risqués (Aucun = Others)
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: ['E4.N7.Q2.G'], conditional_main: null },
    // E4.N7.Q2.1 - Cas prohibés (Aucun)
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    // E4.N7.Q3 - Activités prohibées (Aucune)
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    // E4.N7.Q3.1 - Situations prohibées (Aucune)
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    // E5.N9.Q7 - Registre centralisé (OUI)
    { question_code: 'E5.N9.Q7', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q7.B' },
    // E5.N9.Q4 - Documentation technique (OUI)
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A', multiple_codes: null, conditional_main: null },
    // E5.N9.Q1 - Gestion des risques (OUI)
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A', multiple_codes: null, conditional_main: null },
    // E5.N9.Q2 - Analyse des risques (OUI)
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.A', multiple_codes: null, conditional_main: null },
    // E5.N9.Q3 - Mesures risques (OUI)
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.A', multiple_codes: null, conditional_main: null },
    // E5.N9.Q5 - Types données (Publiques)
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.A'], conditional_main: null },
    // E5.N9.Q6 - Qualité données (OUI)
    { question_code: 'E5.N9.Q6', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q6.B' },
    // E5.N9.Q9 - Cybersécurité (OUI)
    { question_code: 'E5.N9.Q9', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q9.B' },
    // E5.N9.Q8 - Surveillance humaine (OUI)
    { question_code: 'E5.N9.Q8', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q8.B' },
    // E4.N8.Q12 - Jeux/anti-spam (OUI)
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.A', multiple_codes: null, conditional_main: null },
    // E4.N8.Q9 - Interactions personnes (NON)
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B', multiple_codes: null, conditional_main: null },
    // E4.N8.Q10 - Nombre personnes (< 100)
    { question_code: 'E4.N8.Q10', single_value: null, multiple_codes: null, conditional_main: 'E4.N8.Q10.A' },
    // E4.N8.Q11 - Type contenu (Texte)
    { question_code: 'E4.N8.Q11', single_value: null, multiple_codes: ['E4.N8.Q11.A'], conditional_main: null },
    // E6.N10.Q1 - Utilisateurs informés (OUI)
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A', multiple_codes: null, conditional_main: null },
    // E6.N10.Q2 - Label IA (OUI)
    { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A', multiple_codes: null, conditional_main: null },
  ]

  /**
   * Réponses du cas "Traducteur page HTML 2" - Toutes réponses négatives
   * Selon le CSV, ce cas a toutes les mauvaises réponses (NON, > 100, others, etc.)
   */
  const traducteur2Responses = [
    // E4.N7.Q1 - Situation (User)
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    // E4.N7.Q2 - Domaines risqués (Aucun = Others, pas de pénalité risque)
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: ['E4.N7.Q2.G'], conditional_main: null },
    // E4.N7.Q2.1 - Cas prohibés (Aucun)
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    // E4.N7.Q3 - Activités prohibées (Aucune)
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    // E4.N7.Q3.1 - Situations prohibées (Aucune)
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    // E5.N9.Q7 - Registre centralisé (NON) → -5 human_oversight
    { question_code: 'E5.N9.Q7', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q7.A' },
    // E5.N9.Q4 - Documentation technique (NON) → -3 human_oversight
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B', multiple_codes: null, conditional_main: null },
    // E5.N9.Q1 - Gestion des risques (NON) → -3 technical_robustness
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.B', multiple_codes: null, conditional_main: null },
    // E5.N9.Q2 - Analyse des risques (NON) → -3 technical_robustness
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.B', multiple_codes: null, conditional_main: null },
    // E5.N9.Q3 - Mesures risques (NON) → -3 technical_robustness
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.B', multiple_codes: null, conditional_main: null },
    // E5.N9.Q5 - Types données (Personnelles/Stratégiques/Sensibles) → -3 privacy_data
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.B'], conditional_main: null },
    // E5.N9.Q6 - Qualité données (NON) → -3 privacy_data
    { question_code: 'E5.N9.Q6', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q6.A' },
    // E5.N9.Q9 - Cybersécurité (NON) → -3 technical_robustness
    { question_code: 'E5.N9.Q9', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q9.A' },
    // E5.N9.Q8 - Surveillance humaine (NON) → -3 human_oversight
    { question_code: 'E5.N9.Q8', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q8.A' },
    // E4.N8.Q12 - Jeux/anti-spam (NON) → -0.8 privacy_data
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B', multiple_codes: null, conditional_main: null },
    // E4.N8.Q9 - Interactions personnes (OUI) → -3 human_oversight
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A', multiple_codes: null, conditional_main: null },
    // E4.N8.Q10 - Nombre personnes (> 100) → -3 human_oversight
    { question_code: 'E4.N8.Q10', single_value: null, multiple_codes: null, conditional_main: 'E4.N8.Q10.B' },
    // E4.N8.Q11 - Type contenu (Image/Audio/Vidéo) → -3 social_environmental
    { question_code: 'E4.N8.Q11', single_value: null, multiple_codes: ['E4.N8.Q11.B'], conditional_main: null },
    // E6.N10.Q1 - Utilisateurs informés (NON) → -3 transparency
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B', multiple_codes: null, conditional_main: null },
    // E6.N10.Q2 - Label IA (NON) → -3 transparency
    { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.B', multiple_codes: null, conditional_main: null },
  ]

  describe('Traducteur page HTML 1 - Réponses positives', () => {
    test('should calculate global score correctly', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      // Avec toutes les bonnes réponses, le score questionnaire devrait être au maximum (90)
      // Sans COMPL-AI bonus dans les tests, le score devrait être 90
      expect(result.score).toBe(90)
      expect(result.is_eliminated).toBe(false)
    })

    test('should have 100% for Human Agency category (all positive answers)', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      const humanAgency = result.category_scores.find(
        cat => cat.category_id === 'human_agency'
      )

      expect(humanAgency).toBeDefined()
      // Avec toutes les bonnes réponses, 0 points perdus
      expect(humanAgency!.percentage).toBe(100)
    })

    test('should have 100% for Technical Robustness category', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      const technical = result.category_scores.find(
        cat => cat.category_id === 'technical_robustness'
      )

      expect(technical).toBeDefined()
      expect(technical!.percentage).toBe(100)
    })

    test('should have 100% for Privacy & Data category', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      const privacy = result.category_scores.find(
        cat => cat.category_id === 'privacy_data'
      )

      expect(privacy).toBeDefined()
      expect(privacy!.percentage).toBe(100)
    })

    test('should have 100% for Transparency category', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      const transparency = result.category_scores.find(
        cat => cat.category_id === 'transparency'
      )

      expect(transparency).toBeDefined()
      expect(transparency!.percentage).toBe(100)
    })

    test('should have 100% for Social & Environmental category', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      const social = result.category_scores.find(
        cat => cat.category_id === 'social_environmental'
      )

      expect(social).toBeDefined()
      expect(social!.percentage).toBe(100)
    })
  })

  describe('Traducteur page HTML 2 - Réponses négatives', () => {
    test('should calculate global score with penalties', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      // Calcul des pénalités attendues (selon CSV avec nouveaux impacts):
      // E5.N9.Q7 NON: -5
      // E5.N9.Q4 NON: -3
      // E5.N9.Q1 NON: -3
      // E5.N9.Q2 NON: -3
      // E5.N9.Q3 NON: -3
      // E5.N9.Q5 Personnelles: -3
      // E5.N9.Q6 NON: -3
      // E5.N9.Q9 NON: -3
      // E5.N9.Q8 NON: -3
      // E4.N8.Q12 NON: -0.8
      // E4.N8.Q9 OUI: -3
      // E4.N8.Q10 >100: -3
      // E4.N8.Q11 Image: -3
      // E6.N10.Q1 NON: -3
      // E6.N10.Q2 NON: -3
      // Total penalties: -44.8
      // Expected score: 90 - 44.8 = 45.2

      expect(result.score).toBeCloseTo(45.2, 1)
      expect(result.is_eliminated).toBe(false)
    })

    test('should have 0% for Human Agency category (all negative answers)', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      const humanAgency = result.category_scores.find(
        cat => cat.category_id === 'human_agency'
      )

      expect(humanAgency).toBeDefined()
      // Human Agency pénalités: -5 (Q7) -3 (Q4) -3 (Q8) -3 (Q9) -3 (Q10) = -17
      // Max Human Agency: 17 (selon CSV)
      // Score: 0%, car toutes les questions sont mal répondues
      expect(humanAgency!.percentage).toBe(0)
    })

    test('should have low percentage for Technical Robustness', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      const technical = result.category_scores.find(
        cat => cat.category_id === 'technical_robustness'
      )

      expect(technical).toBeDefined()
      // Technical pénalités: -3 (Q1) -3 (Q2) -3 (Q3) -3 (Q9) = -12
      // Max Technical questionnaire: 12
      // Score questionnaire: 0%
      // Sans COMPL-AI: percentage devrait être 0%
      expect(technical!.percentage).toBe(0)
    })

    test('should have low percentage for Privacy & Data', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      const privacy = result.category_scores.find(
        cat => cat.category_id === 'privacy_data'
      )

      expect(privacy).toBeDefined()
      // Privacy pénalités du test: -3 (Q5) -3 (Q6) -0.8 (Q12) = -6.8
      // Mais le max inclut TOUTES les questions du JSON (pas seulement celles du test)
      // Donc le pourcentage n'est pas 0% mais inférieur à 100%
      expect(privacy!.percentage).toBeLessThan(100)
      expect(privacy!.percentage).toBeGreaterThanOrEqual(0)
    })

    test('should have low percentage for Transparency', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      const transparency = result.category_scores.find(
        cat => cat.category_id === 'transparency'
      )

      expect(transparency).toBeDefined()
      // Transparency pénalités: -3 (Q1) -3 (Q2) = -6
      // Max Transparency questionnaire: 6
      // Score questionnaire: 0%
      expect(transparency!.percentage).toBe(0)
    })

    test('should have low percentage for Social & Environmental', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      const social = result.category_scores.find(
        cat => cat.category_id === 'social_environmental'
      )

      expect(social).toBeDefined()
      // Social pénalités du test: -3 (Q11 Image)
      // Mais le max inclut TOUTES les questions du JSON (pas seulement celles du test)
      // Donc le pourcentage n'est pas 0% mais inférieur à 100%
      expect(social!.percentage).toBeLessThan(100)
      expect(social!.percentage).toBeGreaterThanOrEqual(0)
    })

    test('should have breakdown entries for all negative impacts', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      // Vérifie qu'on a des entrées de breakdown pour les impacts négatifs
      expect(result.score_breakdown.length).toBeGreaterThan(0)

      // Vérifie quelques impacts spécifiques
      const q7Impact = result.score_breakdown.find(b => b.question_id === 'E5.N9.Q7')
      expect(q7Impact?.score_impact).toBe(-5)

      const q12Impact = result.score_breakdown.find(b => b.question_id === 'E4.N8.Q12')
      expect(q12Impact?.score_impact).toBe(-0.8)
    })
  })

  describe('Validation des impacts mis à jour', () => {
    test('E5.N9.Q7 NON should have -5 impact (was -10)', async () => {
      const responses = [
        { question_code: 'E5.N9.Q7', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q7.A' }
      ]

      const result = await calculateScore(mockUsecaseId, responses)
      const breakdown = result.score_breakdown.find(b => b.question_id === 'E5.N9.Q7')

      expect(breakdown?.score_impact).toBe(-5)
    })

    test('E5.N9.Q4 NON should have -3 impact (was -10)', async () => {
      const responses = [
        { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B', multiple_codes: null, conditional_main: null }
      ]

      const result = await calculateScore(mockUsecaseId, responses)
      const breakdown = result.score_breakdown.find(b => b.question_id === 'E5.N9.Q4')

      expect(breakdown?.score_impact).toBe(-3)
    })

    test('E4.N8.Q12 NON should have -0.8 impact (was -5)', async () => {
      const responses = [
        { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B', multiple_codes: null, conditional_main: null }
      ]

      const result = await calculateScore(mockUsecaseId, responses)
      const breakdown = result.score_breakdown.find(b => b.question_id === 'E4.N8.Q12')

      expect(breakdown?.score_impact).toBe(-0.8)
    })

    test('E6.N10.Q1 NON should have -3 impact (was -5)', async () => {
      const responses = [
        { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B', multiple_codes: null, conditional_main: null }
      ]

      const result = await calculateScore(mockUsecaseId, responses)
      const breakdown = result.score_breakdown.find(b => b.question_id === 'E6.N10.Q1')

      expect(breakdown?.score_impact).toBe(-3)
    })
  })
})
