export { TryMellon } from './core/trymellon';
export type { TryMellonClient } from './core/trymellon';
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
  SessionClaims,
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
  // Identity linking (F1)
  LinkEmailOptions,
  LinkVerifyOptions,
  LinkChallengeResult,
  LinkedIdentifier,
  // SIWE (F1)
  SiweNonceResult,
  SiweVerifyOptions,
  SiweVerifyResult,
} from './types';

export type { SiwePrepareOptions } from './web3/siwe-message';

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
  IdentifierLinkedPayload,
  IdentifierUnlinkedPayload,
  RecoveryEnrollmentIssuedPayload,
  RecoveryEnrollmentCompletedPayload,
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
