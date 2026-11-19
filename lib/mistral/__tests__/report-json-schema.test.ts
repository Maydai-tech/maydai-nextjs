/** @jest-environment node */

import { FORBIDDEN_REPORT_JSON_SCHEMA, getChatReportResponseFormat } from '../report-json-schema'

describe('getChatReportResponseFormat', () => {
  test('expose un json_schema strict pour les 9 actions', () => {
    const format = getChatReportResponseFormat(false)
    expect(format.type).toBe('json_schema')
    expect(format.jsonSchema.strict).toBe(true)
    expect(format.jsonSchema.name).toBe('ai_act_standard_report')
    expect(format.jsonSchema.schemaDefinition.required).toEqual(
      expect.arrayContaining(['quick_win_1', 'action_3', 'evaluation_risque'])
    )
  })

  test('expose le schéma interdit sans les 9 slots d’action', () => {
    const format = getChatReportResponseFormat(true)
    expect(format.jsonSchema.name).toBe('ai_act_forbidden_report')
    expect(format.jsonSchema.schemaDefinition).toBe(FORBIDDEN_REPORT_JSON_SCHEMA)
    expect(format.jsonSchema.schemaDefinition.required).toEqual(
      expect.arrayContaining(['interdit_1', 'interdit_2', 'interdit_3'])
    )
  })
})
