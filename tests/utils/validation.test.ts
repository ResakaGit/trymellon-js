import { describe, it, expect } from 'vitest';
import { validateCredentialStructure } from '../../src/utils/validation';
import { createCredentialError } from '../../src/errors';

describe('validateCredentialStructure', () => {
  it('should not throw for valid credential (create)', () => {
    const cred = {
      id: 'id',
      rawId: new ArrayBuffer(1),
      response: { clientDataJSON: new ArrayBuffer(1), attestationObject: new ArrayBuffer(1) },
    } as unknown as PublicKeyCredential;
    expect(() => validateCredentialStructure(cred, 'create')).not.toThrow();
  });

  it('should not throw for valid credential (get)', () => {
    const cred = {
      id: 'id',
      rawId: new ArrayBuffer(1),
      response: {
        clientDataJSON: new ArrayBuffer(1),
        authenticatorData: new ArrayBuffer(1),
        signature: new ArrayBuffer(1),
      },
    } as unknown as PublicKeyCredential;
    expect(() => validateCredentialStructure(cred, 'get')).not.toThrow();
  });

  it('should throw createCredentialError for null (create)', () => {
    expect(() => validateCredentialStructure(null, 'create')).toThrow();
    try {
      validateCredentialStructure(null, 'create');
    } catch {
      expect(createCredentialError('create').message).toBeDefined();
    }
  });

  it('should throw for missing id (get)', () => {
    const cred = {
      rawId: new ArrayBuffer(1),
      response: { clientDataJSON: new ArrayBuffer(1), signature: new ArrayBuffer(1) },
    } as unknown as PublicKeyCredential;
    expect(() => validateCredentialStructure(cred, 'get')).toThrow();
  });

  it('should throw for non-object', () => {
    expect(() => validateCredentialStructure('string', 'create')).toThrow();
  });
});
