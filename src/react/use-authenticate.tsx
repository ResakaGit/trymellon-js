import { useCallback } from 'react';
import { useTryMellon } from './context';
import { useTryMellonAction, type UseActionState } from './use-action';
import type { AuthenticateOptions, AuthenticateResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseAuthenticateState = UseActionState<AuthenticateResult>;

export function useAuthenticate(): {
  result: Result<AuthenticateResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
  execute: (options: AuthenticateOptions) => Promise<Result<AuthenticateResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const action = useCallback(
    (options: AuthenticateOptions) => client.authenticate(options),
    [client]
  );
  return useTryMellonAction(action);
}
