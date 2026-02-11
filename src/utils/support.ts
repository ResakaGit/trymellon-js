import type { ClientStatus } from '../types';

export function isWebAuthnSupported(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.credentials) {
      return false;
    }

    if (typeof PublicKeyCredential === 'undefined') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!isWebAuthnSupported()) {
      return false;
    }

    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }

    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function getClientStatus(): Promise<ClientStatus> {
  const isPasskeySupported = isWebAuthnSupported();
  const platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();

  return {
    isPasskeySupported,
    platformAuthenticatorAvailable,
    recommendedFlow: isPasskeySupported ? 'passkey' : 'fallback',
  };
}
