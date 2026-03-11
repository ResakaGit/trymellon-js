import type { ApiClient } from '../api';
import type { EventEmitter } from '../events';
import type {
  AuthenticateOptions,
  AuthenticateResult,
  RegisterOptions,
  RegisterResult,
} from '../../types';
import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { buildTelemetryPayload, type TelemetrySender } from '../ports/telemetry';
import { registerPasskey, authenticatePasskey } from '../webauthn';

type AuthOperation = 'register' | 'authenticate';

type AuthOptions = RegisterOptions | AuthenticateOptions;

export class AuthService {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly eventEmitter: EventEmitter,
    private readonly sandbox: boolean,
    private readonly sandboxToken: string,
    private readonly telemetrySender?: TelemetrySender
  ) {}

  private async sandboxAuthResult(
    operation: AuthOperation,
    options: AuthOptions
  ): Promise<Result<RegisterResult | AuthenticateResult, TryMellonError>> {
    const externalUserId =
      'externalUserId' in options
        ? (options.externalUserId ?? options.external_user_id ?? 'sandbox')
        : (options.external_user_id ?? options.externalUserId ?? 'sandbox');
    const externalId = typeof externalUserId === 'string' ? externalUserId : 'sandbox';

    if (operation === 'register') {
      return Promise.resolve(
        ok({
          success: true,
          credentialId: '',
          status: 'sandbox',
          sessionToken: this.sandboxToken,
          user: { userId: 'sandbox-user', externalUserId: externalId },
        })
      );
    }

    return Promise.resolve(
      ok({
        authenticated: true,
        sessionToken: this.sandboxToken,
        user: { userId: 'sandbox-user', externalUserId: externalId },
      })
    );
  }

  async register(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>> {
    if (this.sandbox) {
      const result = await this.sandboxAuthResult('register', options);
      if (result.ok) {
        this.eventEmitter.emit('success', {
          type: 'success',
          operation: 'register',
          token: result.value.sessionToken,
          user: result.value.user,
        });
      }
      return result as Result<RegisterResult, TryMellonError>;
    }

    const start = Date.now();
    const result = await registerPasskey(options, this.apiClient, this.eventEmitter);
    if (result.ok && this.telemetrySender) {
      this.telemetrySender
        .send(buildTelemetryPayload('register', Date.now() - start))
        .catch(() => {});
    }
    return result;
  }

  async authenticate(
    options: AuthenticateOptions
  ): Promise<Result<AuthenticateResult, TryMellonError>> {
    if (this.sandbox) {
      const result = await this.sandboxAuthResult('authenticate', options);
      if (result.ok) {
        this.eventEmitter.emit('success', {
          type: 'success',
          operation: 'authenticate',
          token: result.value.sessionToken,
          user: result.value.user,
        });
      }
      return result as Result<AuthenticateResult, TryMellonError>;
    }

    const start = Date.now();
    const result = await authenticatePasskey(options, this.apiClient, this.eventEmitter);
    if (result.ok && this.telemetrySender) {
      this.telemetrySender
        .send(buildTelemetryPayload('authenticate', Date.now() - start))
        .catch(() => {});
    }
    return result;
  }
}
