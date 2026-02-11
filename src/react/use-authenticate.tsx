import { useState, useCallback } from 'react';
import { useTryMellon } from './context';
import type { AuthenticateOptions, AuthenticateResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseAuthenticateState = {
  result: Result<AuthenticateResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
};

export function useAuthenticate(): {
  result: Result<AuthenticateResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
  execute: (options: AuthenticateOptions) => Promise<Result<AuthenticateResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const [state, setState] = useState<UseAuthenticateState>({
    result: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (options: AuthenticateOptions) => {
      setState((s) => ({ ...s, loading: true, error: null, result: null }));
      const result = await client.authenticate(options);
      setState({
        result,
        loading: false,
        error: result.ok ? null : result.error,
      });
      return result;
    },
    [client]
  );

  return {
    result: state.result,
    loading: state.loading,
    error: state.error,
    execute,
  };
}
