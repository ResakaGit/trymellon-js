import { describe, it, expect, vi } from 'vitest';
import { runEnvEval } from '../../../src/ui/application';
import type { EnvStatusPort } from '../../../src/ui/ports/env-evaluator.port';

function createMockEnvStatusPort(result: {
  recommendedFlow: 'passkey' | 'fallback';
}): EnvStatusPort {
  return {
    getClientStatus: vi.fn().mockResolvedValue({
      isPasskeySupported: result.recommendedFlow === 'passkey',
      platformAuthenticatorAvailable: result.recommendedFlow === 'passkey',
      recommendedFlow: result.recommendedFlow,
    }),
  };
}

describe('application/evaluate-env.use-case', () => {
  it('should return READY_LOGIN when port resolves passkey and mode=login', async () => {
    const port = createMockEnvStatusPort({ recommendedFlow: 'passkey' });
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'login',
    });
    expect(next).toBe('READY_LOGIN');
  });

  it('should return READY_REGISTER when port resolves passkey and mode=register', async () => {
    const port = createMockEnvStatusPort({ recommendedFlow: 'passkey' });
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'register',
    });
    expect(next).toBe('READY_REGISTER');
  });

  it('should return READY when port resolves passkey and mode=auto', async () => {
    const port = createMockEnvStatusPort({ recommendedFlow: 'passkey' });
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'auto',
    });
    expect(next).toBe('READY');
  });

  it('should return FALLBACK when port resolves fallback', async () => {
    const port = createMockEnvStatusPort({ recommendedFlow: 'fallback' });
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'login',
    });
    expect(next).toBe('FALLBACK');
  });

  it('should return ERROR when port rejects', async () => {
    const port: EnvStatusPort = {
      getClientStatus: vi.fn().mockRejectedValue(new Error('network')),
    };
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'login',
    });
    expect(next).toBe('ERROR');
  });

  it('should force fallback when isMobileOverride is true', async () => {
    const port = createMockEnvStatusPort({ recommendedFlow: 'passkey' });
    const next = await runEnvEval({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'login',
      isMobileOverride: true,
    });
    expect(next).toBe('FALLBACK');
  });
});
