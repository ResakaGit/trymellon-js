export { TryMellon } from './core/trymellon';
export { SANDBOX_SESSION_TOKEN } from './core/constants';

export type { Result } from './utils/result';
export { ok, err } from './utils/result';

export type {
  TryMellonConfig,
  TryMellonPreset,
  CustomClaims,
  RegisterOptions,
  RegisterResult,
  AuthenticateOptions,
  AuthenticateResult,
  ClientStatus,
  TryMellonEvent,
  EventPayload,
  EventHandler,
  EmailFallbackStartOptions,
  EmailFallbackVerifyOptions,
  EmailFallbackVerifyResult,
  SessionValidateResponse,
  OnboardingStartOptions,
  OnboardingStartResult,
  OnboardingStatusResult,
  OnboardingRegisterResult,
  OnboardingRegisterPasskeyOptions,
  OnboardingRegisterPasskeyResult,
  OnboardingCompleteOptions,
  OnboardingCompleteResult,
  EnrollOptions,
  EnrollmentResult,
  ContextHash,
  BridgeContextResponse,
  BridgeChallengeResponse,
  BridgeResult,
  BridgeOptions,
  BridgeCompleteOptions,
  BridgeEnrollmentResult,
  BridgeAuthResult,
  BridgeStatusSnapshot,
  // Action signing
  ActionSignOptions,
  ActionSignResult,
} from './types';

// Webhook types + HMAC verifier for integrators consuming delivery webhooks
export type {
  WebhookEventType,
  WebhookEvent,
  WebhookPayload,
  AuthSuccessPayload,
  CredentialRevokedPayload,
  ApplicationSecretRotatedPayload,
  SessionRevokedPayload,
  SessionLogoutPayload,
  UserLockedPayload,
} from './core/webhook';
export { verifyWebhookSignature } from './core/webhook';

export {
  TryMellonError,
  createError,
  isTryMellonError,
  createNotSupportedError,
  createUserCancelledError,
  createNetworkError,
  createTimeoutError,
  createInvalidArgumentError,
  mapWebAuthnError,
} from './errors';

export type { TryMellonErrorCode } from './errors';

export type { Logger, LogLevel } from './core/ports/logger';
export { ConsoleLogger } from './core/adapters/console-logger';

export { getDeviceName, resolveCredentialName } from './core/aaguid-lookup';
