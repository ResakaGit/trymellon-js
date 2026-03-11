/**
 * Port: client environment evaluation (passkey/fallback). Contract only; implementation in adapters.
 */
import type { UIClientStatus } from '../domain/types';

/** Contract to get client capability status (browser/device). */
export interface EnvStatusPort {
  getClientStatus(): Promise<UIClientStatus>;
}
