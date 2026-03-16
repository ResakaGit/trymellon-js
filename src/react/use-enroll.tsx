import { useCallback, useState, useEffect } from 'react';
import { useTryMellon } from './context';
import { useTryMellonAction, type UseActionState } from './use-action';
import type { EnrollOptions, EnrollmentResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseEnrollState = UseActionState<EnrollmentResult>;

export function useEnroll(): {
  result: Result<EnrollmentResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
  execute: (options: EnrollOptions) => Promise<Result<EnrollmentResult, TryMellonError>>;
  contextHash: string;
} {
  const client = useTryMellon();
  const [contextHash, setContextHash] = useState('');

  useEffect(() => {
    setContextHash(client.getContextHash());
  }, [client]);

  const action = useCallback((options: EnrollOptions) => client.enroll(options), [client]);
  const { result, loading, error, execute } = useTryMellonAction(action);

  return {
    result,
    loading,
    error,
    execute,
    contextHash,
  };
}
