import { describe, it, expect } from 'vitest';
import {
  normalizeClientDataJSONChallengeForRegister,
  serializeCredentialForRegister,
  serializeCredentialForAuth,
} from '../../src/core/webauthn-utils';
import { base64UrlDecode } from '../../src/utils/base64url';
import { isTryMellonError } from '../../src/errors';

function makeArrayBuffer(): ArrayBuffer {
  return new ArrayBuffer(4);
}

describe('serializeCredentialForRegister', () => {
  it('should serialize valid attestation credential', () => {
    const clientDataJSON = makeArrayBuffer();
    const attestationObject = makeArrayBuffer();
    const rawId = makeArrayBuffer();
    const credential = {
      id: 'cred_123',
      rawId,
      type: 'public-key',
      response: {
        clientDataJSON,
        attestationObject,
      },
    } as unknown as PublicKeyCredential;

    const result = serializeCredentialForRegister(credential);

    expect(result.type).toBe('public-key');
    expect(result.id).toBe('cred_123');
    expect(result.rawId).toBeDefined();
    expect(typeof result.rawId).toBe('string');
    expect(result.response.clientDataJSON).toBeDefined();
    expect(result.response.attestationObject).toBeDefined();
  });

  it('should throw when credential.response is missing', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: null,
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForRegister(credential)).toThrow();
    try {
      serializeCredentialForRegister(credential);
    } catch (e) {
      expect(isTryMellonError(e)).toBe(true);
      expect((e as { message: string }).message).toContain('Credential response is missing');
    }
  });

  it('should throw when response has no clientDataJSON ArrayBuffer', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: { clientDataJSON: 'not-a-buffer' },
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForRegister(credential)).toThrow();
    try {
      serializeCredentialForRegister(credential);
    } catch (e) {
      expect((e as { message: string }).message).toContain('Invalid credential response structure');
    }
  });

  it('should throw when attestationObject is missing', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: {
        clientDataJSON: makeArrayBuffer(),
        // no attestationObject
      },
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForRegister(credential)).toThrow();
    try {
      serializeCredentialForRegister(credential);
    } catch (e) {
      expect((e as { message: string }).message).toContain('attestationObject is missing');
    }
  });

  it('should output clientDataJSON with base64url challenge when input has base64 challenge', () => {
    const jsonStr = JSON.stringify({
      type: 'webauthn.create',
      challenge: '1WBklqhZ92fSOYjq42X6SVI5nfwl5pT3O/lVSSzjme4=',
      origin: 'https://example.com',
    });
    const bytes = new TextEncoder().encode(jsonStr);
    const clientDataJSONWithBase64 = new ArrayBuffer(bytes.length);
    new Uint8Array(clientDataJSONWithBase64).set(bytes);
    const credential = {
      id: 'cred_123',
      rawId: new ArrayBuffer(4),
      type: 'public-key',
      response: {
        clientDataJSON: clientDataJSONWithBase64,
        attestationObject: new ArrayBuffer(4),
      },
    } as unknown as PublicKeyCredential;

    const result = serializeCredentialForRegister(credential);

    const decoded = new TextDecoder().decode(
      new Uint8Array(base64UrlDecode(result.response.clientDataJSON))
    );
    const parsed = JSON.parse(decoded) as { challenge: string };
    expect(parsed.challenge).toBe('1WBklqhZ92fSOYjq42X6SVI5nfwl5pT3O_lVSSzjme4');
    expect(parsed.challenge).not.toContain('+');
    expect(parsed.challenge).not.toContain('/');
    expect(parsed.challenge).not.toContain('=');
  });
});

describe('normalizeClientDataJSONChallengeForRegister', () => {
  it('converts challenge from base64 to base64url in clientDataJSON', () => {
    const input = new TextEncoder().encode(
      JSON.stringify({
        type: 'webauthn.create',
        challenge: 'MVdCa2xxaFo5MmZTT1lqcTQyWDZTVkk1bmZ3bDVwVDNPX2xWU1N6am1lNA=',
        origin: 'https://example.com',
      })
    ).buffer;
    const result = normalizeClientDataJSONChallengeForRegister(input);
    const parsed = JSON.parse(new TextDecoder().decode(result)) as { challenge: string };
    expect(parsed.challenge).not.toContain('+');
    expect(parsed.challenge).not.toContain('/');
    expect(parsed.challenge).not.toContain('=');
  });

  it('returns same buffer when challenge is already base64url', () => {
    const json = JSON.stringify({
      type: 'webauthn.create',
      challenge: '1WBklqhZ92fSOYjq42X6SVI5nfwl5pT3O_lVSSzjme4',
      origin: 'https://example.com',
    });
    const input = new TextEncoder().encode(json).buffer;
    const result = normalizeClientDataJSONChallengeForRegister(input);
    expect(new Uint8Array(result)).toEqual(new Uint8Array(input));
  });

  it('returns same buffer when JSON has no challenge', () => {
    const input = new TextEncoder().encode(
      JSON.stringify({ type: 'webauthn.create', origin: 'https://example.com' })
    ).buffer;
    const result = normalizeClientDataJSONChallengeForRegister(input);
    expect(new Uint8Array(result)).toEqual(new Uint8Array(input));
  });
});

describe('serializeCredentialForAuth', () => {
  it('should serialize valid assertion credential', () => {
    const clientDataJSON = makeArrayBuffer();
    const authenticatorData = makeArrayBuffer();
    const signature = makeArrayBuffer();
    const rawId = makeArrayBuffer();
    const credential = {
      id: 'cred_456',
      rawId,
      type: 'public-key',
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
      },
    } as unknown as PublicKeyCredential;

    const result = serializeCredentialForAuth(credential);

    expect(result.type).toBe('public-key');
    expect(result.id).toBe('cred_456');
    expect(result.response.authenticatorData).toBeDefined();
    expect(result.response.clientDataJSON).toBeDefined();
    expect(result.response.signature).toBeDefined();
  });

  it('should include userHandle when present', () => {
    const clientDataJSON = makeArrayBuffer();
    const authenticatorData = makeArrayBuffer();
    const signature = makeArrayBuffer();
    const userHandle = makeArrayBuffer();
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      type: 'public-key',
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle,
      },
    } as unknown as PublicKeyCredential;

    const result = serializeCredentialForAuth(credential);

    expect(result.response.userHandle).toBeDefined();
  });

  it('should throw when credential.response is missing', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: undefined,
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForAuth(credential)).toThrow();
    try {
      serializeCredentialForAuth(credential);
    } catch (e) {
      expect((e as { message: string }).message).toContain('Credential response is missing');
    }
  });

  it('should throw when response has invalid structure', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: { clientDataJSON: null },
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForAuth(credential)).toThrow();
  });

  it('should throw when authenticatorData or signature is missing', () => {
    const credential = {
      id: 'x',
      rawId: makeArrayBuffer(),
      response: {
        clientDataJSON: makeArrayBuffer(),
        // missing authenticatorData and signature
      },
    } as unknown as PublicKeyCredential;

    expect(() => serializeCredentialForAuth(credential)).toThrow();
    try {
      serializeCredentialForAuth(credential);
    } catch (e) {
      expect((e as { message: string }).message).toContain('authenticatorData or signature');
    }
  });
});
