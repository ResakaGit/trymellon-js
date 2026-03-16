export { TryMellon } from './core/trymellon';
export { SANDBOX_SESSION_TOKEN } from './core/constants';

export type { Result } from './utils/result';
export { ok, err } from './utils/result';

export type {
  TryMellonConfig,
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
} from './types';

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
