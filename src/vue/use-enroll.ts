import { ref, onMounted, type Ref } from 'vue';
import { useTryMellon } from './context';
import type { EnrollOptions, EnrollmentResult } from '../types';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export function useEnroll(): {
  result: Ref<Result<EnrollmentResult, TryMellonError> | null>;
  loading: Ref<boolean>;
  error: Ref<TryMellonError | null>;
  execute: (options: EnrollOptions) => Promise<Result<EnrollmentResult, TryMellonError>>;
  contextHash: Ref<string>;
} {
  const client = useTryMellon();
  const result = ref<Result<EnrollmentResult, TryMellonError> | null>(null);
  const loading = ref(false);
  const error = ref<TryMellonError | null>(null);
  const contextHash = ref(client.getContextHash());

  onMounted(() => {
    contextHash.value = client.getContextHash();
  });

  async function execute(options: EnrollOptions) {
    loading.value = true;
    error.value = null;
    result.value = null;
    const res = await client.enroll(options);
    result.value = res;
    loading.value = false;
    error.value = res.ok ? null : res.error;
    return res;
  }

  return { result, loading, error, execute, contextHash };
}
