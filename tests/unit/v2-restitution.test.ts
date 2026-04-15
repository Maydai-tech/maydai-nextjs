/**
 * Restitution / rapport V2 : slots hors périmètre, payload parcours, PDF, duplication V1→V2.
 * Les jeux V1 existants restent couverts par `slot-statuses.test.ts` (fixtures).
 */

import { computeSlotStatuses, type SlotStatusMap } from '@/lib/slot-statuses'
import { transformToOpenAIFormatComplete } from '@/lib/openai-data-transformer'
import { QUESTIONNAIRE_VERSION_V2 } from '@/lib/questionnaire-version'
import {
  buildReportCanonicalItemForSlot,
  declarationStatusPdfLabel,
} from '@/lib/report-canonical-items'
import { sortItemsWithinLegalGroup } from '@/lib/report-plan-ors-ocru-bpgv'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'
import {
  buildV2DuplicateInsertPayload,
  isEligibleV1SourceForV2Duplicate,
} from '@/lib/duplicate-v1-to-v2'

function allSlotsOui(): SlotStatusMap {
  return {
    quick_win_1: 'OUI',
    quick_win_2: 'OUI',
    quick_win_3: 'OUI',
    priorite_1: 'OUI',
    priorite_2: 'OUI',
    priorite_3: 'OUI',
    action_1: 'OUI',
    action_2: 'OUI',
    action_3: 'OUI',
  }
}

describe('V2 restitution — slots hors périmètre', () => {
  test('sans codes E5/E6/E4 actifs, les slots dépendants sont Hors périmètre (pas Information insuffisante)', () => {
    const active = ['E4.N7.Q2']
    const statuses = computeSlotStatuses([], {
      questionnaireVersion: QUESTIONNAIRE_VERSION_V2,
      activeQuestionCodes: active,
    })
    expect(statuses.quick_win_1).toBe('Hors périmètre')
    expect(statuses.action_3).toBe('Hors périmètre')
  })

  test('V1 inchangé : sans options, réponses vides → Information insuffisante sur les slots', () => {
    const statuses = computeSlotStatuses([])
    expect(statuses.quick_win_1).toBe('Information insuffisante')
  })
})

describe('V2 restitution — transformer OpenAI (hors parcours)', () => {
  test('question hors active_question_codes a user_response null et hors_parcours_questionnaire_v2', () => {
    const out = transformToOpenAIFormatComplete(
      {
        id: 'u1',
        name: 'Cas',
        description: 'd',
        deployment_date: '2024-01-01',
        status: 'completed',
        risk_level: 'limited',
        ai_category: 'a',
        system_type: 's',
        responsible_service: 'r',
        deployment_countries: [],
        company_status: 'utilisateur',
        technology_partner: 't',
        llm_model_version: 'v',
        primary_model_id: null,
        checklist_gov_enterprise: [],
        checklist_gov_usecase: [],
        score_base: 0,
        score_model: null,
        score_final: 50,
        is_eliminated: false,
        elimination_reason: '',
      } as any,
      { name: 'C', industry: 'i', city: 'x', country: 'FR' },
      null,
      [
        {
          question_code: 'E4.N7.Q1',
          single_value: 'E4.N7.Q1.B',
        },
      ],
      'user@test.com',
      {
        questionnaire_version: QUESTIONNAIRE_VERSION_V2,
        bpgv_variant: 'limited',
        ors_exit: 'unacceptable',
        active_question_codes: ['E4.N7.Q2'],
      }
    )

    const q = out.questionnaire_questions['E4.N7.Q1']
    expect(q.hors_parcours_questionnaire_v2).toBe(true)
    expect(q.user_response).toBeNull()
  })
})

describe('V2 restitution — items canoniques rapport / PDF', () => {
  test('declarationStatusPdfLabel pour Hors périmètre', () => {
    expect(declarationStatusPdfLabel('Hors périmètre')).toContain('hors périmètre')
  })

  test('slot Hors périmètre → preuve N/A et CTA omis', () => {
    const item = buildReportCanonicalItemForSlot({
      reportSlotKey: 'quick_win_1',
      riskLevel: 'limited',
      nextSteps: { quick_win_1: 'Hors périmètre : texte. Références : Article 16.' },
      slotStatuses: { ...allSlotsOui(), quick_win_1: 'Hors périmètre' },
      documentStatuses: {},
      companyId: 'c1',
      useCaseId: 'uc1',
    })
    expect(item).not.toBeNull()
    expect(item!.declaration.status).toBe('Hors périmètre')
    expect(item!.evidence.status).toBe('not_applicable')
    expect(item!.cta.ctaOmitted).toBe(true)
  })

  test('tri : Hors périmètre après les autres priorités dans un même groupe légal', () => {
    const mk = (slot: string, decl: ReportCanonicalItem['declaration']['status']): ReportCanonicalItem => {
      const it = buildReportCanonicalItemForSlot({
        reportSlotKey: slot,
        riskLevel: 'limited',
        nextSteps: {},
        slotStatuses: { ...allSlotsOui(), [slot]: decl } as SlotStatusMap,
        documentStatuses: {},
        companyId: 'c',
        useCaseId: 'u',
      })
      if (!it) throw new Error('item null')
      return it
    }

    const a = mk('quick_win_1', 'NON')
    const b = mk('quick_win_2', 'Hors périmètre')
    const sorted = sortItemsWithinLegalGroup([b, a])
    expect(sorted[sorted.length - 1].declaration.status).toBe('Hors périmètre')
  })
})

describe('Duplication V1 → V2', () => {
  test('isEligibleV1SourceForV2Duplicate', () => {
    expect(isEligibleV1SourceForV2Duplicate({ company_id: 'c', name: 'x', questionnaire_version: 1 })).toBe(
      true
    )
    expect(isEligibleV1SourceForV2Duplicate({ company_id: 'c', name: 'x', questionnaire_version: 2 })).toBe(
      false
    )
  })

  test('buildV2DuplicateInsertPayload ne recopie pas les métadonnées de parcours V2', () => {
    const now = '2026-01-01T00:00:00.000Z'
    const row = {
      company_id: 'c',
      name: 'Source',
      description: 'd',
      questionnaire_version: 1,
    }
    const p = buildV2DuplicateInsertPayload(row, 'user-1', now)
    expect(p.questionnaire_version).toBe(2)
    expect(p.bpgv_variant).toBeNull()
    expect(p.ors_exit).toBeNull()
    expect(p.active_question_codes).toEqual([])
    expect(p.status).toBe('draft')
    expect(p.name).toBe('Source (V2)')
  })
})

describe('Admin — libellé parcours (logique)', () => {
  test('questionnaire_version 2 → libellé V2', () => {
    const label = (qv: unknown) => (qv === 2 ? 'Parcours V2' : 'Parcours V1')
    expect(label(2)).toBe('Parcours V2')
    expect(label(1)).toBe('Parcours V1')
    expect(label(undefined)).toBe('Parcours V1')
  })
})
