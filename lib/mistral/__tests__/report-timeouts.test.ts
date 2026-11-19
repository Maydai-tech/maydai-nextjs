import {
  CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS,
  REPORT_AGENT_MAX_RETRIES,
  REPORT_AGENT_TIMEOUT_MS,
} from '@/lib/mistral/report-timeouts'

describe('report-timeouts', () => {
  test('le budget agent + retries reste sous les 120s de la route', () => {
    const backoffMs = 1_000
    const agentBudget =
      REPORT_AGENT_MAX_RETRIES * REPORT_AGENT_TIMEOUT_MS +
      Math.max(0, REPORT_AGENT_MAX_RETRIES - 1) * backoffMs
    expect(agentBudget).toBeLessThan(120_000)
    expect(CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS).toBeLessThan(120_000)
    expect(CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS).toBeGreaterThan(agentBudget)
  })
})
