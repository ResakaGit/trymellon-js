import type { Result } from '../utils/result';
import type { TryMellonError } from '../errors';

export interface HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<Result<T, TryMellonError>>;
  post<T>(
    url: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<Result<T, TryMellonError>>;
  delete<T>(url: string, headers?: Record<string, string>): Promise<Result<T, TryMellonError>>;
}
