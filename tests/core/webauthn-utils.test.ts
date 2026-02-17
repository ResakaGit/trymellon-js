import { describe, it, expect } from 'vitest';
import {
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

  it('should output clientDataJSON unchanged (original payload)', () => {
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
    expect(parsed.challenge).toBe('1WBklqhZ92fSOYjq42X6SVI5nfwl5pT3O/lVSSzjme4=');
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
