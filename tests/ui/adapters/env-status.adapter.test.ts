import { describe, it, expect, vi } from 'vitest';
import {
  createEnvStatusAdapter,
  createEnvStatusPortFromCore,
} from '../../../src/ui/adapters/infra/env-status.adapter';

describe('ui/adapters/env-status.adapter', () => {
  it('createEnvStatusAdapter returns port that resolves UIClientStatus', async () => {
    const port = createEnvStatusAdapter();
    const status = await port.getClientStatus();
    expect(status).toHaveProperty('isPasskeySupported');
    expect(status).toHaveProperty('platformAuthenticatorAvailable');
    expect(status).toHaveProperty('recommendedFlow');
    expect(['passkey', 'fallback']).toContain(status.recommendedFlow);
  });

  it('createEnvStatusPortFromCore with core without getStatus uses createEnvStatusAdapter', async () => {
    const port = createEnvStatusPortFromCore({});
    const status = await port.getClientStatus();
    expect(status).toHaveProperty('recommendedFlow');
  });

  it('createEnvStatusPortFromCore with core with getStatus uses core', async () => {
    const port = createEnvStatusPortFromCore({
      getStatus: vi.fn().mockResolvedValue({
        isPasskeySupported: true,
        platformAuthenticatorAvailable: false,
        recommendedFlow: 'passkey',
      }),
    });
    const status = await port.getClientStatus();
    expect(status.recommendedFlow).toBe('passkey');
    expect(status.isPasskeySupported).toBe(true);
  });
});
