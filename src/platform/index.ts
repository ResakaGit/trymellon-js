/**
 * Sub-path entry `@trymellon/js/platform` (ADR-SDK-005 · SDK-01).
 *
 * Helper surface for integrators orchestrating TryMellon tenant sign-up via
 * the hosted signup link pattern (ADR-076). Zero dependency on the main
 * `TryMellon` client — stateless factory; no publishable key required, since
 * `POST /v1/onboarding/start` is public by design.
 *
 * Typical flow:
 *   1. Server-side: `createPlatform().createSignupLink({ returnUrl })`.
 *   2. Redirect / QR: integrator points the user to `hostedUrl`.
 *   3. Poll: `awaitSignupCompletion(sessionId, { signal })`.
 */
export { createPlatform } from './factory';
export type {
  TryMellonPlatform,
  TryMellonPlatformConfig,
  CreateSignupLinkOptions,
  CreateSignupLinkResult,
  SignupStatus,
  SignupStatusResult,
  AwaitSignupCompletionOptions,
  AwaitSignupCompletionResult,
} from './types';
