import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { isWebAuthnSupported } from '../utils/support';
import type { EventEmitter } from './events';
import type { TryMellonError } from '../errors';
import { mapWebAuthnError, createNotSupportedError, createInvalidArgumentError } from '../errors';
import { validateCredentialStructure } from '../utils/validation';

export type CeremonyOperation = 'register' | 'authenticate';

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
 * Orquesta un flujo genérico WebAuthn (Ceremonia) para eliminar código duplicado en el SDK.
 * Encapsula la llamada de start, la creación de opciones, la invocación de la API de credenciales
 * del navegador, la validación de la estructura base y la llamada de finish.
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

    // 2. Crear opciones
    const optionsResult = createOptions(startResult.value);
    if (!optionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: optionsResult.error });
      return err(optionsResult.error);
    }

    // 3. Invocar al navegador
    const credential = (await invoke(optionsResult.value)) as PublicKeyCredential;
    if (!credential) {
      const error = createInvalidArgumentError(
        'credential',
        `${operation === 'register' ? 'creation' : 'retrieval'} failed`
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

    // 4. Completar en servidor
    const finishResult = await finish(startResult.value, credential);
    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    eventEmitter.emit('success', { type: 'success', operation });
    return ok(finishResult.value);
  } catch (error) {
    const tryMellonError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: tryMellonError });
    return err(tryMellonError);
  }
}
