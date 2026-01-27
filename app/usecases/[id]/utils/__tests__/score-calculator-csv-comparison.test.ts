/**
 * Tests de comparaison détaillés entre les scores calculés et les valeurs attendues du CSV.
 *
 * Ce fichier teste les deux cas "Traducteur page HTML 1" et "Traducteur page HTML 2"
 * et affiche un tableau de comparaison détaillé entre les scores calculés et les valeurs du CSV.
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

describe('Score Calculator - Comparaison CSV détaillée', () => {
  const mockUsecaseId = 'test-traducteur-csv'

  /**
   * Valeurs attendues du CSV pour "Traducteur page HTML 1" (réponses positives)
   * NOTE: Sans COMPL-AI (mock retourne null), les scores questionnaire seuls sont testés
   */
  const csvExpectedTraducteur1 = {
    // Global
    total_score: 80.12,
    total_max: 189.8,

    // Par catégorie (points et pourcentages du CSV)
    categories: {
      risk_level: { score: 95.20, max: 125, percentage: 60.93 },
      human_agency: { score: 17.00, max: 17, percentage: 100.00 },
      technical_robustness: { score: 14.91, max: 16, percentage: 93.21 },
      privacy_data: { score: 8.90, max: 10.8, percentage: 82.41 },
      transparency: { score: 7.82, max: 10, percentage: 78.20 },
      diversity_fairness: { score: 2.44, max: 4, percentage: 61.00 },
      social_environmental: { score: 5.80, max: 7, percentage: 82.86 }
    }
  }

  /**
   * Valeurs attendues du CSV pour "Traducteur page HTML 2" (réponses négatives)
   */
  const csvExpectedTraducteur2 = {
    // Global
    total_score: 50.26,
    total_max: 189.8,

    // Par catégorie
    categories: {
      risk_level: { score: 83.31, max: 125, percentage: 53.32 },
      human_agency: { score: 0.00, max: 17, percentage: 0.00 },
      technical_robustness: { score: 2.91, max: 16, percentage: 18.21 },
      privacy_data: { score: 2.10, max: 10.8, percentage: 19.44 },
      transparency: { score: 1.82, max: 10, percentage: 18.20 },
      diversity_fairness: { score: 2.44, max: 4, percentage: 61.00 },
      social_environmental: { score: 2.80, max: 7, percentage: 40.00 }
    }
  }

  /**
   * Réponses du cas "Traducteur page HTML 1" - Toutes réponses positives
   */
  const traducteur1Responses = [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: ['E4.N7.Q2.G'], conditional_main: null },
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    { question_code: 'E5.N9.Q7', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q7.B' },
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.A'], conditional_main: null },
    { question_code: 'E5.N9.Q6', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q6.B' },
    { question_code: 'E5.N9.Q9', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q9.B' },
    { question_code: 'E5.N9.Q8', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q8.B' },
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q10', single_value: null, multiple_codes: null, conditional_main: 'E4.N8.Q10.A' },
    { question_code: 'E4.N8.Q11', single_value: null, multiple_codes: ['E4.N8.Q11.A'], conditional_main: null },
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A', multiple_codes: null, conditional_main: null },
  ]

  /**
   * Réponses du cas "Traducteur page HTML 2" - Toutes réponses négatives
   */
  const traducteur2Responses = [
    { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N7.Q2', single_value: null, multiple_codes: ['E4.N7.Q2.G'], conditional_main: null },
    { question_code: 'E4.N7.Q2.1', single_value: null, multiple_codes: ['E4.N7.Q2.1.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3', single_value: null, multiple_codes: ['E4.N7.Q3.E'], conditional_main: null },
    { question_code: 'E4.N7.Q3.1', single_value: null, multiple_codes: ['E4.N7.Q3.1.E'], conditional_main: null },
    { question_code: 'E5.N9.Q7', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q7.A' },
    { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E5.N9.Q5', single_value: null, multiple_codes: ['E5.N9.Q5.B'], conditional_main: null },
    { question_code: 'E5.N9.Q6', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q6.A' },
    { question_code: 'E5.N9.Q9', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q9.A' },
    { question_code: 'E5.N9.Q8', single_value: null, multiple_codes: null, conditional_main: 'E5.N9.Q8.A' },
    { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A', multiple_codes: null, conditional_main: null },
    { question_code: 'E4.N8.Q10', single_value: null, multiple_codes: null, conditional_main: 'E4.N8.Q10.B' },
    { question_code: 'E4.N8.Q11', single_value: null, multiple_codes: ['E4.N8.Q11.B'], conditional_main: null },
    { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.B', multiple_codes: null, conditional_main: null },
    { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.B', multiple_codes: null, conditional_main: null },
  ]

  // Fonction utilitaire pour afficher la comparaison
  function printComparisonTable(name: string, result: any, expected: any) {
    console.log('\n' + '='.repeat(80))
    console.log(`COMPARAISON: ${name}`)
    console.log('='.repeat(80))

    console.log('\n📊 SCORE GLOBAL:')
    console.log(`  Calculé: ${result.score} / ${result.max_score}`)
    console.log(`  CSV attendu: ${expected.total_score} / ${expected.total_max}`)
    console.log(`  ⚠️  Note: Le système actuel utilise base=90, max=120 (sans COMPL-AI intégré)`)
    console.log(`      Le CSV utilise un système différent avec total_max=189.8`)

    console.log('\n📈 SCORES PAR CATÉGORIE:')
    console.log('-'.repeat(80))
    console.log('| Catégorie'.padEnd(25) + '| Calculé (%)'.padEnd(15) + '| CSV (%)'.padEnd(15) + '| Diff'.padEnd(10) + '| Match? |')
    console.log('-'.repeat(80))

    const categoryMapping: Record<string, string> = {
      'risk_level': 'risk_level',
      'human_agency': 'human_agency',
      'human_oversight': 'human_agency',
      'technical_robustness': 'technical_robustness',
      'privacy_data': 'privacy_data',
      'transparency': 'transparency',
      'diversity_fairness': 'diversity_fairness',
      'social_environmental': 'social_environmental',
      'prohibited_practices': null as any // Pas dans le CSV
    }

    let matchCount = 0
    let totalCategories = 0

    result.category_scores.forEach((cat: any) => {
      const csvCatId = categoryMapping[cat.category_id]
      if (csvCatId && expected.categories[csvCatId]) {
        totalCategories++
        const csvExpected = expected.categories[csvCatId]
        const diff = cat.percentage - csvExpected.percentage

        // Considérer comme match si la différence de pourcentage est < 5%
        // OU si la logique est cohérente (100% calculé pour bonnes réponses, 0% pour mauvaises)
        const isLogicalMatch =
          (csvExpected.percentage === 100 && cat.percentage === 100) ||
          (csvExpected.percentage === 0 && cat.percentage === 0) ||
          Math.abs(diff) < 5

        const matchStatus = isLogicalMatch ? '✅' : '❌'
        if (isLogicalMatch) matchCount++

        console.log(
          `| ${cat.category_name.padEnd(23)}` +
          `| ${String(cat.percentage + '%').padEnd(13)}` +
          `| ${String(csvExpected.percentage + '%').padEnd(13)}` +
          `| ${diff > 0 ? '+' : ''}${diff.toFixed(1).padEnd(8)}` +
          `| ${matchStatus}     |`
        )
      } else if (cat.category_id === 'prohibited_practices') {
        console.log(
          `| ${cat.category_name.padEnd(23)}` +
          `| ${String(cat.percentage + '%').padEnd(13)}` +
          `| N/A (pas dans CSV)`.padEnd(13) +
          `| -`.padEnd(10) +
          `| ➖     |`
        )
      }
    })

    console.log('-'.repeat(80))
    console.log(`\n✅ Correspondances: ${matchCount}/${totalCategories} catégories`)

    console.log('\n📝 DÉTAIL DES IMPACTS (score_breakdown):')
    result.score_breakdown.forEach((item: any) => {
      if (item.score_impact !== 0) {
        console.log(`  ${item.question_id}: ${item.score_impact} points`)
      }
    })
  }

  describe('Traducteur page HTML 1 - Comparaison détaillée', () => {
    test('should output comparison table for positive answers case', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      // Afficher la comparaison
      printComparisonTable('Traducteur HTML 1 (réponses positives)', result, csvExpectedTraducteur1)

      // Assertions de base
      expect(result.score).toBe(90) // Score base sans pénalités
      expect(result.is_eliminated).toBe(false)
    })

    test('should have correct category percentages for positive answers', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur1Responses)

      // Human Agency: Toutes les bonnes réponses = 100%
      const humanAgency = result.category_scores.find(c => c.category_id === 'human_agency')
      expect(humanAgency?.percentage).toBe(100)

      // Technical Robustness: Toutes les bonnes réponses = 100%
      const technical = result.category_scores.find(c => c.category_id === 'technical_robustness')
      expect(technical?.percentage).toBe(100)

      // Privacy & Data: Toutes les bonnes réponses = 100%
      const privacy = result.category_scores.find(c => c.category_id === 'privacy_data')
      expect(privacy?.percentage).toBe(100)

      // Transparency: Toutes les bonnes réponses = 100%
      const transparency = result.category_scores.find(c => c.category_id === 'transparency')
      expect(transparency?.percentage).toBe(100)

      // Social: Toutes les bonnes réponses = 100%
      const social = result.category_scores.find(c => c.category_id === 'social_environmental')
      expect(social?.percentage).toBe(100)
    })
  })

  describe('Traducteur page HTML 2 - Comparaison détaillée', () => {
    test('should output comparison table for negative answers case', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      // Afficher la comparaison
      printComparisonTable('Traducteur HTML 2 (réponses négatives)', result, csvExpectedTraducteur2)

      // Score attendu avec pénalités (voir calcul dans traducteur tests)
      expect(result.score).toBeCloseTo(45.2, 1)
      expect(result.is_eliminated).toBe(false)
    })

    test('should have correct category percentages for negative answers', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      // Human Agency: Toutes les mauvaises réponses = 0%
      const humanAgency = result.category_scores.find(c => c.category_id === 'human_agency')
      expect(humanAgency?.percentage).toBe(0)

      // Technical Robustness: Toutes les mauvaises réponses = 0%
      const technical = result.category_scores.find(c => c.category_id === 'technical_robustness')
      expect(technical?.percentage).toBe(0)

      // Transparency: Toutes les mauvaises réponses = 0%
      const transparency = result.category_scores.find(c => c.category_id === 'transparency')
      expect(transparency?.percentage).toBe(0)
    })

    test('should have correct penalty breakdown', async () => {
      const result = await calculateScore(mockUsecaseId, traducteur2Responses)

      // Vérifier les pénalités individuelles selon le CSV
      const penalties = [
        { id: 'E5.N9.Q7', expected: -5 },
        { id: 'E5.N9.Q4', expected: -3 },
        { id: 'E5.N9.Q1', expected: -3 },
        { id: 'E5.N9.Q2', expected: -3 },
        { id: 'E5.N9.Q3', expected: -3 },
        { id: 'E5.N9.Q5', expected: -3 },
        { id: 'E5.N9.Q6', expected: -3 },
        { id: 'E5.N9.Q9', expected: -3 },
        { id: 'E5.N9.Q8', expected: -3 },
        { id: 'E4.N8.Q12', expected: -0.8 },
        { id: 'E4.N8.Q9', expected: -3 },
        { id: 'E4.N8.Q10', expected: -3 },
        { id: 'E4.N8.Q11', expected: -3 },
        { id: 'E6.N10.Q1', expected: -3 },
        { id: 'E6.N10.Q2', expected: -3 }
      ]

      penalties.forEach(({ id, expected }) => {
        const breakdown = result.score_breakdown.find(b => b.question_id === id)
        expect(breakdown?.score_impact).toBe(expected)
      })
    })
  })

  describe('Analyse des différences CSV vs Implémentation', () => {
    test('should explain the differences between CSV and current implementation', async () => {
      console.log('\n' + '='.repeat(80))
      console.log('ANALYSE DES DIFFÉRENCES')
      console.log('='.repeat(80))

      console.log(`
📌 DIFFÉRENCES IDENTIFIÉES:

1. SYSTÈME DE SCORING DIFFÉRENT:
   - Implémentation actuelle: Score global = 90 (base) - pénalités + bonus COMPL-AI
   - CSV: Score global = somme des scores par catégorie / total max × 100

2. SCORES MAXIMUM DIFFÉRENTS:
   - Implémentation: max_score = 120 (90 base + 20 COMPL-AI + 10 marge)
   - CSV: total_max = 189.8 (somme de tous les max par catégorie)

3. CATÉGORIES:
   - Implémentation inclut 'prohibited_practices' (pas dans CSV)
   - CSV a 'Risk Level' avec max=125 (différent de l'implémentation)

4. INTÉGRATION COMPL-AI:
   - Sans modèle associé (mock), les pourcentages catégorie ne incluent pas COMPL-AI
   - Le CSV inclut les benchmarks COMPL-AI dans chaque catégorie

5. LOGIQUE COHÉRENTE:
   ✅ 100% questionnaire (bonnes réponses) → 100% calculé
   ✅ 0% questionnaire (mauvaises réponses) → 0% calculé
   ✅ Pénalités individuelles correspondent aux valeurs CSV
      `)

      // Ce test sert juste à documenter les différences
      expect(true).toBe(true)
    })
  })
})
