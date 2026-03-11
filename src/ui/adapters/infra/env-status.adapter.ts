/**
 * Adapter: EnvStatusPort implementado delegando en getClientStatus.
 * Maps ClientStatus (core) → UIClientStatus (domain); coupling to core only here.
 */
import type { ClientStatus } from '../../../types';
import type { UIClientStatus } from '../../domain/types';
import type { EnvStatusPort } from '../../ports/env-evaluator.port';
import { getClientStatus } from '../../../utils/support';

function mapClientStatusToUI(status: ClientStatus): UIClientStatus {
  return {
    isPasskeySupported: status.isPasskeySupported,
    platformAuthenticatorAvailable: status.platformAuthenticatorAvailable,
    recommendedFlow: status.recommendedFlow,
  };
}

/**
 * Creates adapter implementing EnvStatusPort using getClientStatus from utils/support. Used in tests or paths without core.
 */
export function createEnvStatusAdapter(): EnvStatusPort {
  return {
    getClientStatus: async (): Promise<UIClientStatus> => {
      const status = await getClientStatus();
      return mapClientStatusToUI(status);
    },
  };
}

/**
 * Creates adapter implementing EnvStatusPort using core TryMellon getStatus. Caller MUST validate getClientStatus result with isClientStatus.
 */
export function createEnvStatusPortFromCore(core: unknown): EnvStatusPort {
  const candidate = core as { getStatus?: () => Promise<ClientStatus> };
  if (typeof candidate.getStatus !== 'function') {
    return createEnvStatusAdapter();
  }

  const getStatus = candidate.getStatus;

  return {
    getClientStatus: async (): Promise<UIClientStatus> => {
      const status = await getStatus();
      return mapClientStatusToUI(status);
    },
  };
}
