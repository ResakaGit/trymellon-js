import { beforeEach, afterEach } from 'vitest';
import { setupWebAuthnMock } from './mocks/webauthn';

let cleanup: (() => void) | null = null;

beforeEach(() => {
  cleanup = setupWebAuthnMock({
    shouldSucceed: true,
    authenticatorType: 'platform',
  });
});

afterEach(() => {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
});
