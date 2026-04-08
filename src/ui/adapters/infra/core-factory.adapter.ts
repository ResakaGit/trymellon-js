/**
 * Adapter/factory to create and validate core instances for UI. Infrastructure: may import real TryMellon.
 */
import { TryMellon } from '../../../core/trymellon';
import type { CoreAuthPort, CoreAuthOptions } from '../../ports';

export interface CoreConfig {
  appId: string;
  publishableKey: string;
}

/** Creates core instance for UI using minimal CoreAuthPort. Returns null on failure; Presentation decides. */
export function createCoreForUI(config: CoreConfig): CoreAuthPort | null {
  const result = TryMellon.create({
    appId: config.appId,
    publishableKey: config.publishableKey,
  });

  if (!result.ok || result.value == null) {
    return null;
  }

  return result.value as CoreAuthPort;
}

/** Runtime guard: injected instance satisfies CoreAuthPort. Keeps WCs decoupled from concrete TryMellon. */
export function isCoreAuthPort(candidate: unknown): candidate is CoreAuthPort {
  if (candidate == null || typeof candidate !== 'object') return false;

  const maybe = candidate as Record<string, unknown>;

  const hasSignIn = typeof maybe.signIn === 'function';
  const hasSignUp = typeof maybe.signUp === 'function';
  const hasOn = typeof maybe.on === 'function';
  const hasEnroll = typeof maybe.enroll === 'function';
  const hasGetContextHash = typeof maybe.getContextHash === 'function';

  return hasSignIn && hasSignUp && hasOn && hasEnroll && hasGetContextHash;
}

/** Normalizes Presentation options to CoreAuthOptions. Forwards externalUserId when present. */
export function toCoreAuthOptions(externalUserId: string | null): CoreAuthOptions {
  return externalUserId ? { externalUserId } : {};
}
