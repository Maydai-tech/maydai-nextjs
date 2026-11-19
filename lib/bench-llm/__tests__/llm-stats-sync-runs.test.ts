import {
  buildLlmStatsSyncRunFromFailure,
  buildLlmStatsSyncRunFromResult,
} from '../llm-stats-sync-runs'

describe('llm-stats-sync-runs', () => {
  test('builds a successful history row from sync result', () => {
    const row = buildLlmStatsSyncRunFromResult(
      {
        success: true,
        startedAt: '2026-07-11T10:00:00.000Z',
        finishedAt: '2026-07-11T10:00:03.000Z',
        durationMs: 3000,
        modelsFetched: 2,
        modelsCreated: 1,
        modelsUpdated: 1,
        modelsUnchanged: 0,
        createdModels: [{ model_name: 'New Model', model_provider: 'OpenAI' }],
        updatedModels: [
          {
            model_name: 'Updated Model',
            model_provider: 'Anthropic',
            changedFields: ['context_length'],
          },
        ],
        errors: [],
      },
      true,
    )

    expect(row).toMatchObject({
      started_at: '2026-07-11T10:00:00.000Z',
      finished_at: '2026-07-11T10:00:03.000Z',
      status: 'success',
      models_fetched: 2,
      models_created: 1,
      models_updated: 1,
      models_unchanged: 0,
      email_sent: true,
      failure_email_sent: false,
      execution_time_ms: 3000,
    })
    expect(row.created_models).toHaveLength(1)
    expect(row.updated_models[0].changedFields).toEqual(['context_length'])
  })

  test('builds a partial history row when sync has errors', () => {
    const row = buildLlmStatsSyncRunFromResult(
      {
        success: false,
        startedAt: '2026-07-11T10:00:00.000Z',
        finishedAt: '2026-07-11T10:00:03.000Z',
        durationMs: 3000,
        modelsFetched: 1,
        modelsCreated: 0,
        modelsUpdated: 0,
        modelsUnchanged: 0,
        createdModels: [],
        updatedModels: [],
        errors: ['OpenAI/GPT: erreur update'],
      },
      false,
    )

    expect(row.status).toBe('partial')
    expect(row.errors).toEqual(['OpenAI/GPT: erreur update'])
    expect(row.email_sent).toBe(false)
  })

  test('builds a failure history row from an exception', () => {
    const row = buildLlmStatsSyncRunFromFailure({
      startedAt: '2026-07-11T10:00:00.000Z',
      finishedAt: '2026-07-11T10:00:05.000Z',
      error: new Error('LLM Stats failed'),
      failureEmailSent: true,
    })

    expect(row).toMatchObject({
      status: 'error',
      models_fetched: 0,
      models_created: 0,
      models_updated: 0,
      models_unchanged: 0,
      errors: ['LLM Stats failed'],
      email_sent: false,
      failure_email_sent: true,
      execution_time_ms: 5000,
    })
  })
})
