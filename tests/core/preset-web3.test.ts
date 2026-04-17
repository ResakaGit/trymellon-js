import { describe, it, expect } from 'vitest';
import { TryMellon } from '../../src/core/trymellon';

const baseConfig = {
  appId: 'app_test',
  publishableKey: 'pk_test',
  apiBaseUrl: 'https://api.example.test',
};

describe('TryMellon preset — ADR-SDK-004 §2.3', () => {
  it('Given no preset, when created, then defaults to "saas"', () => {
    const r = TryMellon.create({ ...baseConfig });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.preset).toBe('saas');
  });

  it('Given preset "web3", when created, then preset is "web3"', () => {
    const r = TryMellon.create({ ...baseConfig, preset: 'web3' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.preset).toBe('web3');
  });

  it('Given invalid preset, when created, then returns INVALID_ARGUMENT', () => {
    const r = TryMellon.create({ ...baseConfig, preset: 'trading' as 'web3' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_ARGUMENT');
  });

  it('Given no active session, when identity.linkEmail called, then returns INVALID_ARGUMENT', async () => {
    const r = TryMellon.create({ ...baseConfig, preset: 'web3' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Narrowed type hides `identity` under 'saas'; this test targets the 'web3' runtime guard.
    const web3Client = r.value as unknown as TryMellon;
    const linkResult = await web3Client.identity.linkEmail('test@example.com');
    expect(linkResult.ok).toBe(false);
    if (linkResult.ok) return;
    expect(linkResult.error.code).toBe('INVALID_ARGUMENT');
    expect(linkResult.error.message).toContain('authenticated session');
  });

  it('Given no active session, when siwe.prepareMessage called, then succeeds (pure, no auth required)', () => {
    const r = TryMellon.create({ ...baseConfig, preset: 'web3' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const web3Client = r.value as unknown as TryMellon;
    const msg = web3Client.siwe.prepareMessage({
      domain: 'example.com',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2021-09-30T16:25:24Z',
    });
    expect(msg.ok).toBe(true);
  });
});
