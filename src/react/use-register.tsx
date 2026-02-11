import { useState, useCallback } from 'react';
import { useTryMellon } from './context';
import type { RegisterOptions, RegisterResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseRegisterState = {
  result: Result<RegisterResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
};

export function useRegister(): {
  result: Result<RegisterResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
  execute: (options: RegisterOptions) => Promise<Result<RegisterResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const [state, setState] = useState<UseRegisterState>({
    result: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (options: RegisterOptions) => {
      setState((s) => ({ ...s, loading: true, error: null, result: null }));
      const result = await client.register(options);
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
