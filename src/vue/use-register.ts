import { ref, type Ref } from 'vue';
import { useTryMellon } from './context';
import type { RegisterOptions, RegisterResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export function useSignUp(): {
  result: Ref<Result<RegisterResult, TryMellonError> | null>;
  loading: Ref<boolean>;
  error: Ref<TryMellonError | null>;
  execute: (options: RegisterOptions) => Promise<Result<RegisterResult, TryMellonError>>;
} {
  const client = useTryMellon();
  const result = ref<Result<RegisterResult, TryMellonError> | null>(null);
  const loading = ref(false);
  const error = ref<TryMellonError | null>(null);

  async function execute(options: RegisterOptions) {
    loading.value = true;
    error.value = null;
    result.value = null;
    const res = await client.signUp(options);
    result.value = res;
    loading.value = false;
    error.value = res.ok ? null : res.error;
    return res;
  }

  return { result, loading, error, execute };
}
