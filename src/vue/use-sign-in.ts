import { ref, type Ref } from 'vue';
import { useTryMellon } from './context';
import type { AuthenticateOptions, AuthenticateResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export function useSignIn(): {
  result: Ref<Result<AuthenticateResult, TryMellonError> | null>;
  loading: Ref<boolean>;
  error: Ref<TryMellonError | null>;
  execute: (options: AuthenticateOptions) => Promise<Result<AuthenticateResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const result = ref<Result<AuthenticateResult, TryMellonError> | null>(null);
  const loading = ref(false);
  const error = ref<TryMellonError | null>(null);

  async function execute(options: AuthenticateOptions) {
    loading.value = true;
    error.value = null;
    result.value = null;
    const res = await client.signIn(options);
    result.value = res;
    loading.value = false;
    error.value = res.ok ? null : res.error;
    return res;
  }

  return { result, loading, error, execute };
}
