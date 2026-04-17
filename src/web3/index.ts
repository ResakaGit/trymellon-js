/**
 * Sub-path entry `@trymellon/js/web3`.
 * Exposes zero-dep helpers usable without instantiating a full `TryMellon` client.
 * See ADR-SDK-004 §2.4.
 */
export { prepareSiweMessage } from './siwe-message';
export type { SiwePrepareOptions } from './siwe-message';

export type {
  LinkEmailOptions,
  LinkVerifyOptions,
  LinkChallengeResult,
  LinkedIdentifier,
  SiweNonceResult,
  SiweVerifyOptions,
  SiweVerifyResult,
} from '../types';
