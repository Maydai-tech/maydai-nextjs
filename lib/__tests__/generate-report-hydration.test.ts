/**
 * TDD — Bug "Risque minimal" sur cas d'usage RH/Éducation.
 *
 * Reproduit le scénario réel observé en production sur "Assistant RH Trieur de CV"
 * (id `de3f4108-…`) : `usecase_responses` ne contient AUCUNE ligne `E4.*`,
 * mais `usecases.checklist_gov_usecase` (JSONB) contient bien :
 *   - `E4.N7.Q2.A` (Annexe III — Emploi / gestion des travailleurs)
 *   - `E4.N7.Q5.B` (pas de garde-fou art. 6.3 → conserve le « high »)
 *
 * Objectif : prouver par les tests que `mergeChecklistIntoUserResponses`
 * (utilitaire DÉJÀ existant) suffit à hydrater le payload AVANT envoi
 * au moteur de qualification V3 et au formateur de grounding LLM —
 * sans toucher au calcul numérique du score.
 */

import { mergeChecklistIntoUserResponses } from '@/lib/merge-checklist-into-user-responses'
import { dbResponsesToQuestionnaireAnswers } from '@/lib/scoring-v2-server'
import { resolveQualificationOutcomeV3 } from '@/lib/qualification-v3-decision'
import { formatReportGroundingForPrompt } from '@/lib/report-llm-grounding'

/** `system_type` réel observé en base sur le dossier RH bug (V3 long, qualified). */
const SYSTEM_TYPE_AUTONOME = 'Système autonome'

/** Réplique du bug : `usecase_responses` vide pour ce cas d'usage. */
const dbResponsesEmpty: Parameters<typeof mergeChecklistIntoUserResponses>[0] = []

/** Pivots E4 cochés via `checklist_gov_usecase` (JSONB) — seule source de vérité. */
const checklistGovUsecase: string[] = ['E4.N7.Q1.B', 'E4.N7.Q2.A', 'E4.N7.Q5.B']
const checklistGovEnterprise: string[] = []

describe('Generate Report — Early Stage Hydration (bug RH "Risque minimal")', () => {
  describe('Sans hydratation — reproduction du bug en l\'état', () => {
    test('V3 retombe sur "minimal" si E4 absent de `usecase_responses`', () => {
      const answers = dbResponsesToQuestionnaireAnswers(dbResponsesEmpty)
      const outcome = resolveQualificationOutcomeV3(answers, SYSTEM_TYPE_AUTONOME)

      expect(outcome).toEqual({
        classification_status: 'qualified',
        risk_level: 'minimal',
      })
    })
  })

  describe('Avec hydratation `mergeChecklistIntoUserResponses` (correctif)', () => {
    test('Test 1 (Badge) — V3 conclut `high` après fusion checklist E4', () => {
      const merged = mergeChecklistIntoUserResponses(
        dbResponsesEmpty,
        checklistGovEnterprise,
        checklistGovUsecase,
      )

      // La fusion produit bien des entrées E4.N7.Q1 / Q2 / Q5
      const codes = merged.map((r) => r.question_code)
      expect(codes).toEqual(expect.arrayContaining(['E4.N7.Q1', 'E4.N7.Q2', 'E4.N7.Q5']))

      // `dbResponsesToQuestionnaireAnswers` produit la forme attendue par V3 :
      // checkbox `E4.N7.Q2` → tableau ; radio `E4.N7.Q5` → string
      const answers = dbResponsesToQuestionnaireAnswers(merged)
      expect(answers['E4.N7.Q2']).toEqual(['E4.N7.Q2.A'])
      expect(answers['E4.N7.Q5']).toBe('E4.N7.Q5.B')

      // Annexe III sensible (Emploi) + Q5 = "Non" (pas de garde-fou 6.3) → high.
      const outcome = resolveQualificationOutcomeV3(answers, SYSTEM_TYPE_AUTONOME)
      expect(outcome).toEqual({
        classification_status: 'qualified',
        risk_level: 'high',
      })
    })

    test('Test 2 (Grounding LLM) — la sortie inclut le pivot E4 et le badge `high`', () => {
      const merged = mergeChecklistIntoUserResponses(
        dbResponsesEmpty,
        checklistGovEnterprise,
        checklistGovUsecase,
      )

      const groundingBlock = formatReportGroundingForPrompt({
        responses: merged.map((r) => ({
          question_code: r.question_code,
          single_value: r.single_value,
          multiple_codes: r.multiple_codes,
          multiple_labels: r.multiple_labels,
          conditional_main: r.conditional_main,
        })),
        riskLevelCode: 'high',
        classificationImpossible: false,
        questionnaireParcours: {
          questionnaire_version: 3,
          bpgv_variant: 'long',
          ors_exit: null,
          active_question_codes: ['E4.N7.Q1', 'E4.N7.Q2', 'E4.N7.Q5'],
        },
        checklist_gov_enterprise: checklistGovEnterprise,
        checklist_gov_usecase: checklistGovUsecase,
      })

      // 1. Le badge autoritatif (high) est bien transmis comme garde-fou anti-contradiction.
      expect(groundingBlock).toContain("Niveau AI Act retenu par l'application (code) : high")

      // 2. La consigne d'enracinement « high » est présente.
      expect(groundingBlock).toContain('Citer au moins un déclencheur réel parmi Annexe III')

      // 3. Les pivots E4 cochés via checklist sont reportés en clair dans la ligne « Critères de gouvernance cas d'usage ».
      expect(groundingBlock).toContain('E4.N7.Q2.A')
      expect(groundingBlock).toContain('E4.N7.Q5.B')
    })
  })
})
