import type { ApiClient } from '../api';
import type { EventEmitter } from '../events';
import type { RecoverAccountOptions, RecoverAccountResult } from '../../types';
import type { Result } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { recoverAccount } from '../recover';

export class RecoveryService {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly eventEmitter: EventEmitter
  ) {}

  recover(options: RecoverAccountOptions): Promise<Result<RecoverAccountResult, TryMellonError>> {
    return recoverAccount(options, this.apiClient, this.eventEmitter);
  }
}
