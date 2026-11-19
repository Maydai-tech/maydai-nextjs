/** @jest-environment node */

jest.mock('node-mailjet', () => ({
  __esModule: true,
  default: { apiConnect: jest.fn(() => ({ post: () => ({ request: async () => ({ body: {} }) }) })) },
}));

describe('Mailjet environment compatibility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MAILJET_API_KEY: 'test-api-key' };
    delete process.env.MAILJET_SECRET_KEY;
    delete process.env.MAILJET_API_SECRET;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses the API secret configured on Vercel', async () => {
    process.env.MAILJET_API_SECRET = 'test-vercel-secret';
    await jest.isolateModulesAsync(async () => {
      const { sendLlmStatsSyncFailureEmail } = await import('../mailjet');
      // Le client Mailjet est créé au premier envoi (plus au chargement du module).
      await sendLlmStatsSyncFailureEmail(new Error('test')).catch(() => undefined);
      const { default: client } = await import('node-mailjet');
      expect(client.apiConnect).toHaveBeenCalledWith('test-api-key', 'test-vercel-secret');
    });
  });

  it('preserves precedence of the legacy secret', async () => {
    process.env.MAILJET_SECRET_KEY = 'test-legacy-secret';
    process.env.MAILJET_API_SECRET = 'test-vercel-secret';
    await jest.isolateModulesAsync(async () => {
      const { sendLlmStatsSyncFailureEmail } = await import('../mailjet');
      // Le client Mailjet est créé au premier envoi (plus au chargement du module).
      await sendLlmStatsSyncFailureEmail(new Error('test')).catch(() => undefined);
      const { default: client } = await import('node-mailjet');
      expect(client.apiConnect).toHaveBeenCalledWith('test-api-key', 'test-legacy-secret');
    });
  });
});
