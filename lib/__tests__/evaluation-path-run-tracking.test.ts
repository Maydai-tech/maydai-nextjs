/** @jest-environment node */

import { completeOpenEvaluationPathRun } from '@/lib/evaluation-path-run-tracking'

describe('completeOpenEvaluationPathRun', () => {
  test('clôture le run ouvert avec durée et résultat', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'run-1',
        started_at: '2026-01-01T12:00:00.000Z',
        completed_at: null,
      },
      error: null,
    })
    const updateEq = jest.fn().mockReturnThis()
    const updateIs = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({
      eq: updateEq,
      is: updateIs,
    })
    updateEq.mockReturnValue({ is: updateIs })

    const selectChain: Record<string, unknown> = {}
    selectChain.select = () => selectChain
    selectChain.eq = () => selectChain
    selectChain.is = () => selectChain
    selectChain.order = () => selectChain
    selectChain.limit = () => selectChain
    selectChain.maybeSingle = maybeSingle

    const from = jest.fn((table: string) => {
      if (table !== 'evaluation_path_runs') throw new Error(table)
      return { ...selectChain, update }
    })

    await completeOpenEvaluationPathRun({ from } as never, {
      usecaseId: 'uc-1',
      pathMode: 'assistant',
      classificationStatus: 'qualified',
      riskLevel: 'minimal',
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        completion_seconds: expect.any(Number),
        classification_status: 'qualified',
        risk_level: 'minimal',
      })
    )
    expect(updateEq).toHaveBeenCalledWith('id', 'run-1')
  })

  test('ne met pas à jour s’il n’y a pas de run ouvert', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const update = jest.fn()
    const selectChain: Record<string, unknown> = {}
    selectChain.select = () => selectChain
    selectChain.eq = () => selectChain
    selectChain.is = () => selectChain
    selectChain.order = () => selectChain
    selectChain.limit = () => selectChain
    selectChain.maybeSingle = maybeSingle

    const from = jest.fn(() => ({ ...selectChain, update }))

    await completeOpenEvaluationPathRun({ from } as never, {
      usecaseId: 'uc-1',
      pathMode: 'assistant',
    })

    expect(update).not.toHaveBeenCalled()
  })
})
