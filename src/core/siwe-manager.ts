import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import type { TryMellonError } from '../errors';
import type { SiweNonceResult, SiweVerifyOptions, SiweVerifyResult } from '../types';

export class SiweManager {
  constructor(private readonly apiClient: ApiClient) {}

  async getNonce(): Promise<Result<SiweNonceResult, TryMellonError>> {
    return this.apiClient.getSiweNonce();
  }

  async verify(options: SiweVerifyOptions): Promise<Result<SiweVerifyResult, TryMellonError>> {
    return this.apiClient.verifySiwe(options);
  }
}
