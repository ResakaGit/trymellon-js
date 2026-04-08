import { useCallback } from 'react';
import { useTryMellon } from './context';
import { useTryMellonAction, type UseActionState } from './use-action';
import type { RegisterOptions, RegisterResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseSignUpState = UseActionState<RegisterResult>;

export function useSignUp(): {
  result: Result<RegisterResult, TryMellonError> | null;
  loading: boolean;
  error: TryMellonError | null;
  execute: (options: RegisterOptions) => Promise<Result<RegisterResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const action = useCallback((options: RegisterOptions) => client.signUp(options), [client]);
  return useTryMellonAction(action);
}
