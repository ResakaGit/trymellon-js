import type { CDPSession } from '@playwright/test';

/**
 * Creates a software virtual authenticator via Chrome DevTools Protocol.
 * Enables real FIDO2/WebAuthn flows in Playwright without physical hardware.
 *
 * @returns authenticatorId — must be passed to removeVirtualAuthenticator on teardown
 */
export async function createVirtualAuthenticator(cdp: CDPSession): Promise<string> {
  await cdp.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  return authenticatorId;
}

export async function removeVirtualAuthenticator(
  cdp: CDPSession,
  authenticatorId: string
): Promise<void> {
  await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
}
