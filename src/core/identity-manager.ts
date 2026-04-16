import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import type { TryMellonError } from '../errors';
import type {
  LinkEmailOptions,
  LinkVerifyOptions,
  LinkChallengeResult,
  LinkedIdentifier,
} from '../types';

export class IdentityManager {
  constructor(private readonly apiClient: ApiClient) {}

  async link(
    userId: string,
    options: LinkEmailOptions
  ): Promise<Result<LinkChallengeResult, TryMellonError>> {
    return this.apiClient.requestLinkEmail(userId, options);
  }

  async verify(
    userId: string,
    options: LinkVerifyOptions
  ): Promise<Result<LinkedIdentifier, TryMellonError>> {
    return this.apiClient.confirmLinkEmail(userId, options);
  }

  async list(userId: string): Promise<Result<LinkedIdentifier[], TryMellonError>> {
    return this.apiClient.listIdentifiers(userId);
  }

  async unlink(userId: string, identifierId: string): Promise<Result<void, TryMellonError>> {
    return this.apiClient.unlinkIdentifier(userId, identifierId);
  }
}
