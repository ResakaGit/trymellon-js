import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getClientStatus,
} from '../../src/utils/support';
import type { ClientStatus } from '../../src/types';

describe('isWebAuthnSupported', () => {
  const originalNavigator = global.navigator;
  const originalPublicKeyCredential = global.PublicKeyCredential;

  afterEach(() => {
    global.navigator = originalNavigator;
    global.PublicKeyCredential = originalPublicKeyCredential;
  });

  it('should return true when WebAuthn is fully supported', () => {
    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as Navigator;

    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn();
    } as unknown as typeof PublicKeyCredential;

    expect(isWebAuthnSupported()).toBe(true);
  });

  it('should return false when navigator.credentials is missing', () => {
    global.navigator = {} as Navigator;
    global.PublicKeyCredential = class {} as unknown as typeof PublicKeyCredential;

    expect(isWebAuthnSupported()).toBe(false);
  });

  it('should return false when PublicKeyCredential is missing', () => {
    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as Navigator;

    // @ts-expect-error - Testing missing PublicKeyCredential
    global.PublicKeyCredential = undefined;

    expect(isWebAuthnSupported()).toBe(false);
  });

  it('should return false when navigator is missing', () => {
    // @ts-expect-error - Testing missing navigator
    global.navigator = undefined;
    global.PublicKeyCredential = class {} as unknown as typeof PublicKeyCredential;

    expect(isWebAuthnSupported()).toBe(false);
  });
});

describe('isPlatformAuthenticatorAvailable', () => {
  const originalNavigator = global.navigator;
  const originalPublicKeyCredential = global.PublicKeyCredential;

  beforeEach(() => {
    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as Navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.PublicKeyCredential = originalPublicKeyCredential;
  });

  it('should return true when platform authenticator is available', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
    } as unknown as typeof PublicKeyCredential;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(true);
  });

  it('should return false when platform authenticator is not available', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(false);
    } as unknown as typeof PublicKeyCredential;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it('should return false when method throws error', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockRejectedValue(new Error('Not supported'));
    } as unknown as typeof PublicKeyCredential;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it('should return false when PublicKeyCredential is missing', async () => {
    // @ts-expect-error - Testing missing PublicKeyCredential
    global.PublicKeyCredential = undefined;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it('should return false when method is missing', async () => {
    global.PublicKeyCredential = class {} as unknown as typeof PublicKeyCredential;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });

  it('should return false when navigator is missing', async () => {
    // @ts-expect-error - Testing missing navigator
    global.navigator = undefined;

    const result = await isPlatformAuthenticatorAvailable();
    expect(result).toBe(false);
  });
});

describe('getClientStatus', () => {
  const originalNavigator = global.navigator;
  const originalPublicKeyCredential = global.PublicKeyCredential;

  beforeEach(() => {
    global.navigator = {
      credentials: {
        create: vi.fn(),
        get: vi.fn(),
      },
    } as unknown as Navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.PublicKeyCredential = originalPublicKeyCredential;
  });

  it('should return status with passkey support and platform authenticator', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
    } as unknown as typeof PublicKeyCredential;

    const status = await getClientStatus();

    expect(status).toMatchObject<ClientStatus>({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    });
  });

  it('should return status with passkey support but no platform authenticator', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(false);
    } as unknown as typeof PublicKeyCredential;

    const status = await getClientStatus();

    expect(status).toMatchObject<ClientStatus>({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'passkey',
    });
  });

  it('should return fallback when WebAuthn is not supported', async () => {
    // @ts-expect-error - Testing missing PublicKeyCredential
    global.PublicKeyCredential = undefined;

    const status = await getClientStatus();

    expect(status).toMatchObject<ClientStatus>({
      isPasskeySupported: false,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'fallback',
    });
  });

  it('should return fallback when platform authenticator check fails', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi
        .fn()
        .mockRejectedValue(new Error('Error'));
    } as unknown as typeof PublicKeyCredential;

    const status = await getClientStatus();

    expect(status).toMatchObject<ClientStatus>({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'passkey',
    });
  });

  it('should have all required properties', async () => {
    global.PublicKeyCredential = class {
      static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
    } as unknown as typeof PublicKeyCredential;

    const status = await getClientStatus();

    expect(status).toHaveProperty('isPasskeySupported');
    expect(status).toHaveProperty('platformAuthenticatorAvailable');
    expect(status).toHaveProperty('recommendedFlow');
    expect(['passkey', 'fallback']).toContain(status.recommendedFlow);
  });
});
