/**
 * Schémas JSON Structured Output pour l’agent rapport AI Act.
 * Alignés sur extractNextStepsFromReport / usecase_nextsteps.
 */

const evaluationRisqueSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    niveau: { type: 'string' },
    justification: { type: 'string' },
  },
  required: ['niveau', 'justification'],
} as const

const narrativeProperties = {
  introduction_contextuelle: { type: 'string' },
  evaluation_risque: evaluationRisqueSchema,
  impact_attendu: { type: 'string' },
  conclusion: { type: 'string' },
} as const

export const STANDARD_REPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...narrativeProperties,
    quick_win_1: { type: 'string' },
    quick_win_2: { type: 'string' },
    quick_win_3: { type: 'string' },
    priorite_1: { type: 'string' },
    priorite_2: { type: 'string' },
    priorite_3: { type: 'string' },
    action_1: { type: 'string' },
    action_2: { type: 'string' },
    action_3: { type: 'string' },
  },
  required: [
    'introduction_contextuelle',
    'evaluation_risque',
    'quick_win_1',
    'quick_win_2',
    'quick_win_3',
    'priorite_1',
    'priorite_2',
    'priorite_3',
    'action_1',
    'action_2',
    'action_3',
    'impact_attendu',
    'conclusion',
  ],
} as const

export const FORBIDDEN_REPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...narrativeProperties,
    interdit_1: { type: 'string' },
    interdit_2: { type: 'string' },
    interdit_3: { type: 'string' },
  },
  required: [
    'introduction_contextuelle',
    'evaluation_risque',
    'interdit_1',
    'interdit_2',
    'interdit_3',
    'impact_attendu',
    'conclusion',
  ],
} as const

export type ChatReportResponseFormat = {
  type: 'json_schema'
  jsonSchema: {
    name: string
    description: string
    schemaDefinition: Record<string, unknown>
    strict: true
  }
}

export function getChatReportResponseFormat(isUnacceptable: boolean): ChatReportResponseFormat {
  if (isUnacceptable) {
    return {
      type: 'json_schema',
      jsonSchema: {
        name: 'ai_act_forbidden_report',
        description:
          'Rapport AI Act pour un cas interdit : narratif + 3 champs interdit_1..3, sans les 9 actions.',
        schemaDefinition: FORBIDDEN_REPORT_JSON_SCHEMA as unknown as Record<string, unknown>,
        strict: true,
      },
    }
  }

  return {
    type: 'json_schema',
    jsonSchema: {
      name: 'ai_act_standard_report',
      description: 'Rapport AI Act standard : narratif + 9 actions (quick_win, priorite, action).',
      schemaDefinition: STANDARD_REPORT_JSON_SCHEMA as unknown as Record<string, unknown>,
      strict: true,
    },
  }
}
