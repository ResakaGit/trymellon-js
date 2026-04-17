import { describe, it, expect } from 'vitest';
import { prepareSiweMessage } from '../../src/web3';

describe('@trymellon/js/web3 sub-path barrel — ADR-SDK-004 §2.4', () => {
  it('Given valid EIP-4361 inputs, when prepareSiweMessage imported from barrel, then returns ok', () => {
    const result = prepareSiweMessage({
      domain: 'example.com',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2026-04-17T00:00:00Z',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain('Chain ID: 1');
  });

  it('Given invalid address, when prepareSiweMessage imported from barrel, then returns err', () => {
    const result = prepareSiweMessage({
      domain: 'example.com',
      address: '0xZZZ',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2026-04-17T00:00:00Z',
    });
    expect(result.ok).toBe(false);
  });
});
