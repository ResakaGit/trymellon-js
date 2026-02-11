import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWebAuthnMock, setupWebAuthnMock } from './webauthn';

describe('createWebAuthnMock', () => {
  it('should create a mock with default config', () => {
    const mock = createWebAuthnMock();

    expect(mock.PublicKeyCredential).toBeDefined();
    expect(mock.navigator).toBeDefined();
    expect(mock.navigator.credentials).toBeDefined();
    expect(mock.navigator.credentials.create).toBeDefined();
    expect(mock.navigator.credentials.get).toBeDefined();
  });

  it('should create credential successfully by default', async () => {
    const mock = createWebAuthnMock();
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    const credential = await mock.navigator.credentials.create(options);

    expect(credential).toBeDefined();
    expect(credential.id).toBe('mock_credential_id');
    expect(credential.type).toBe('public-key');
  });

  it('should throw error when shouldSucceed is false', async () => {
    const mock = createWebAuthnMock({ shouldSucceed: false });
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    await expect(mock.navigator.credentials.create(options)).rejects.toThrow();
  });

  it('should throw timeout error when shouldTimeout is true', async () => {
    const mock = createWebAuthnMock({ shouldTimeout: true });
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    await expect(mock.navigator.credentials.create(options)).rejects.toThrow('Operation timed out');
  });

  it('should throw cancel error when shouldCancel is true', async () => {
    const mock = createWebAuthnMock({ shouldCancel: true });
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    await expect(mock.navigator.credentials.create(options)).rejects.toThrow('User cancelled');
  });

  it('should support custom credentialId', async () => {
    const mock = createWebAuthnMock({ credentialId: 'custom_id' });
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    const credential = await mock.navigator.credentials.create(options);

    expect(credential.id).toBe('custom_id');
  });

  it('should support delay', async () => {
    const mock = createWebAuthnMock({ delay: 10 });
    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    const start = Date.now();
    await mock.navigator.credentials.create(options);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(8);
  });

  it('should support get() method', async () => {
    const mock = createWebAuthnMock();
    const options: CredentialRequestOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rpId: 'example.com',
      },
    };

    const credential = await mock.navigator.credentials.get(options);

    expect(credential).toBeDefined();
    expect(credential.id).toBe('mock_credential_id');
    expect(credential.type).toBe('public-key');
  });

  it('should support isUserVerifyingPlatformAuthenticatorAvailable', async () => {
    const mock = createWebAuthnMock({ authenticatorType: 'platform' });

    const result = await mock.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    expect(result).toBe(true);
  });

  it('should return false for cross-platform authenticator', async () => {
    const mock = createWebAuthnMock({ authenticatorType: 'cross-platform' });

    const result = await mock.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    expect(result).toBe(false);
  });

  it('should support isConditionalMediationAvailable', async () => {
    const mock = createWebAuthnMock();

    const result = await mock.PublicKeyCredential.isConditionalMediationAvailable();

    expect(result).toBe(true);
  });
});

describe('setupWebAuthnMock', () => {
  beforeEach(() => {
    delete (globalThis as { navigator?: Navigator }).navigator;
    delete (globalThis as { PublicKeyCredential?: typeof PublicKeyCredential }).PublicKeyCredential;
  });

  afterEach(() => {
    delete (globalThis as { navigator?: Navigator }).navigator;
    delete (globalThis as { PublicKeyCredential?: typeof PublicKeyCredential }).PublicKeyCredential;
  });

  it('should setup global mocks', () => {
    const cleanup = setupWebAuthnMock();

    expect(globalThis.navigator).toBeDefined();
    expect(globalThis.PublicKeyCredential).toBeDefined();

    cleanup();
  });

  it('should restore original values on cleanup', () => {
    const originalNavigator = globalThis.navigator;
    const originalPublicKeyCredential = globalThis.PublicKeyCredential;

    const cleanup = setupWebAuthnMock();

    expect(globalThis.navigator).not.toBe(originalNavigator);
    expect(globalThis.PublicKeyCredential).not.toBe(originalPublicKeyCredential);

    cleanup();

    expect(globalThis.navigator).toBe(originalNavigator);
    expect(globalThis.PublicKeyCredential).toBe(originalPublicKeyCredential);
  });

  it('should support custom config', async () => {
    const cleanup = setupWebAuthnMock({ credentialId: 'custom_id' });

    const options: CredentialCreationOptions = {
      publicKey: {
        challenge: new ArrayBuffer(8),
        rp: { id: 'example.com', name: 'Example' },
        user: {
          id: new ArrayBuffer(8),
          name: 'user',
          displayName: 'User',
        },
        pubKeyCredParams: [],
      },
    };

    const credential = await globalThis.navigator.credentials.create(options);

    expect(credential.id).toBe('custom_id');

    cleanup();
  });
});
