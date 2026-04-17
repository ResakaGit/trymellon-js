import { describe, it, expect } from 'vitest';
import { prepareSiweMessage } from '../../src/web3/siwe-message';

/**
 * Vectors follow EIP-4361 canonical examples.
 * @see https://eips.ethereum.org/EIPS/eip-4361
 */
describe('prepareSiweMessage — EIP-4361 canonical vectors', () => {
  it('Given statement + expiration, when built, then matches EIP-4361 example 1', () => {
    const result = prepareSiweMessage({
      domain: 'example.com',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      statement: 'I accept the ExampleOrg Terms of Service: https://example.com/tos',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2021-09-30T16:25:24Z',
      expirationTime: '2021-10-01T16:25:24Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(
      'example.com wants you to sign in with your Ethereum account:\n' +
        '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB\n' +
        '\n' +
        'I accept the ExampleOrg Terms of Service: https://example.com/tos\n' +
        '\n' +
        'URI: https://example.com/login\n' +
        'Version: 1\n' +
        'Chain ID: 1\n' +
        'Nonce: 32891757\n' +
        'Issued At: 2021-09-30T16:25:24Z\n' +
        'Expiration Time: 2021-10-01T16:25:24Z'
    );
  });

  it('Given no statement, when built, then blank lines remain between address and URI', () => {
    const result = prepareSiweMessage({
      domain: 'example.com',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2021-09-30T16:25:24Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(
      'example.com wants you to sign in with your Ethereum account:\n' +
        '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB\n' +
        '\n' +
        'URI: https://example.com/login\n' +
        'Version: 1\n' +
        'Chain ID: 1\n' +
        'Nonce: 32891757\n' +
        'Issued At: 2021-09-30T16:25:24Z'
    );
  });

  it('Given all optional fields + resources, when built, then full canonical form', () => {
    const result = prepareSiweMessage({
      domain: 'service.org',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      statement: 'I accept the ServiceOrg Terms of Service: https://service.org/tos',
      uri: 'https://service.org/login',
      chainId: 1,
      nonce: '32891757',
      issuedAt: '2021-09-30T16:25:24Z',
      expirationTime: '2021-10-01T16:25:24Z',
      notBefore: '2021-09-30T16:25:24Z',
      requestId: '1234567890',
      resources: [
        'ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/',
        'https://example.com/my-web2-claim.json',
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(
      'service.org wants you to sign in with your Ethereum account:\n' +
        '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB\n' +
        '\n' +
        'I accept the ServiceOrg Terms of Service: https://service.org/tos\n' +
        '\n' +
        'URI: https://service.org/login\n' +
        'Version: 1\n' +
        'Chain ID: 1\n' +
        'Nonce: 32891757\n' +
        'Issued At: 2021-09-30T16:25:24Z\n' +
        'Expiration Time: 2021-10-01T16:25:24Z\n' +
        'Not Before: 2021-09-30T16:25:24Z\n' +
        'Request ID: 1234567890\n' +
        'Resources:\n' +
        '- ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/\n' +
        '- https://example.com/my-web2-claim.json'
    );
  });

  it('Given issuedAt omitted, when built, then defaults to now (ISO 8601 format)', () => {
    const result = prepareSiweMessage({
      domain: 'example.com',
      address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
      uri: 'https://example.com/login',
      chainId: 1,
      nonce: '32891757',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatch(/Issued At: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);
  });
});

describe('prepareSiweMessage — validation errors', () => {
  const valid = {
    domain: 'example.com',
    address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
    uri: 'https://example.com/login',
    chainId: 1,
    nonce: '32891757',
    issuedAt: '2021-09-30T16:25:24Z',
  } as const;

  it.each([
    ['domain empty', { ...valid, domain: '' }, 'domain'],
    ['domain with whitespace', { ...valid, domain: 'foo bar.com' }, 'domain'],
    [
      'address missing 0x',
      { ...valid, address: '4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB' },
      'address',
    ],
    ['address too short', { ...valid, address: '0x1234' }, 'address'],
    ['chainId zero', { ...valid, chainId: 0 }, 'chainId'],
    ['chainId negative', { ...valid, chainId: -1 }, 'chainId'],
    ['chainId non-integer', { ...valid, chainId: 1.5 }, 'chainId'],
    ['uri invalid', { ...valid, uri: 'not a url' }, 'uri'],
    ['nonce too short', { ...valid, nonce: 'abc' }, 'nonce'],
    ['nonce non-alnum', { ...valid, nonce: 'abcd-efgh-ijkl' }, 'nonce'],
    ['issuedAt malformed', { ...valid, issuedAt: 'yesterday' }, 'issuedAt'],
  ])('Given %s, when built, then returns INVALID_ARGUMENT on field "%s"', (_label, opts, field) => {
    const result = prepareSiweMessage(opts);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ARGUMENT');
    expect(result.error.details).toEqual(expect.objectContaining({ field }));
  });

  it('Given statement with line break, when built, then INVALID_ARGUMENT (would break parsing)', () => {
    const result = prepareSiweMessage({ ...valid, statement: 'first line\nsecond line' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ARGUMENT');
  });

  it('Given invalid resource URI, when built, then INVALID_ARGUMENT pointing at the index', () => {
    const result = prepareSiweMessage({
      ...valid,
      resources: ['https://ok.example', 'not-a-uri'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details).toEqual(expect.objectContaining({ field: 'resources[1]' }));
  });
});
