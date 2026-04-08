import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { isWebAuthnSupported } from '../utils/support';
import type { EventEmitter } from './events';
import type { TryMellonError } from '../errors';
import { mapWebAuthnError, createNotSupportedError, createInvalidArgumentError } from '../errors';
import { validateCredentialStructure } from '../utils/validation';

export type CeremonyOperation = 'signUp' | 'signIn';

export interface InvokeCeremonyContext<
  TStartResult,
  TFinishResult,
  TCeremonyOptions extends CredentialCreationOptions | CredentialRequestOptions,
> {
  operation: CeremonyOperation;
  eventEmitter: EventEmitter;
  start: () => Promise<Result<TStartResult, TryMellonError>>;
  createOptions: (startResult: TStartResult) => Result<TCeremonyOptions, TryMellonError>;
  invoke: (options: TCeremonyOptions) => Promise<Credential | null>;
  finish: (
    startResult: TStartResult,
    credential: PublicKeyCredential
  ) => Promise<Result<TFinishResult, TryMellonError>>;
}

/**
 * Orchestrates a generic WebAuthn flow (Ceremony) to remove duplicated code in the SDK.
 * Encapsulates start call, options creation, browser credentials API invocation,
 * base structure validation, and finish call.
 */
export async function invokeCeremony<
  TStartResult,
  TFinishResult,
  TCeremonyOptions extends CredentialCreationOptions | CredentialRequestOptions,
>(
  context: InvokeCeremonyContext<TStartResult, TFinishResult, TCeremonyOptions>
): Promise<Result<TFinishResult, TryMellonError>> {
  const { operation, eventEmitter, start, createOptions, invoke, finish } = context;

  try {
    eventEmitter.emit('start', { type: 'start', operation });

    if (!isWebAuthnSupported()) {
      const error = createNotSupportedError();
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 1. Obtener challenge del servidor
    const startResult = await start();
    if (!startResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: startResult.error });
      return err(startResult.error);
    }

    // 2. Create options
    const optionsResult = createOptions(startResult.value);
    if (!optionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: optionsResult.error });
      return err(optionsResult.error);
    }

    // 3. Invoke browser
    const credential = (await invoke(optionsResult.value)) as PublicKeyCredential;
    if (!credential) {
      const error = createInvalidArgumentError(
        'credential',
        `${operation === 'signUp' ? 'creation' : 'retrieval'} failed`
      );
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    try {
      validateCredentialStructure(credential);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 4. Completar en servidor (success lo emite el caller con token/user; 03-eventos-seguridad)
    const finishResult = await finish(startResult.value, credential);
    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    return ok(finishResult.value);
  } catch (error) {
    const tryMellonError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: tryMellonError });
    return err(tryMellonError);
  }
}
