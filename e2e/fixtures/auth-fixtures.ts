import { test as base } from '@playwright/test';
import {
  createVirtualAuthenticator,
  removeVirtualAuthenticator,
} from '../utils/virtual-authenticator.js';

/**
 * Extends the base Playwright test with a virtual FIDO2 authenticator fixture.
 *
 * The fixture:
 * 1. Opens a CDP session on the page
 * 2. Creates a software virtual authenticator (CTAP2 + internal transport)
 * 3. Yields the authenticatorId to the test
 * 4. Removes the virtual authenticator on teardown
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/auth-fixtures.js';
 *
 * test('register passkey', async ({ page, authenticatorId }) => {
 *   // authenticatorId is active — WebAuthn calls use the virtual authenticator
 *   await page.goto('/register');
 *   // ...
 * });
 * ```
 */
export const test = base.extend<{ authenticatorId: string }>({
  authenticatorId: async ({ page }, use) => {
    const cdp = await page.context().newCDPSession(page);
    const authenticatorId = await createVirtualAuthenticator(cdp);
    await use(authenticatorId);
    await removeVirtualAuthenticator(cdp, authenticatorId);
  },
});

export { expect } from '@playwright/test';
