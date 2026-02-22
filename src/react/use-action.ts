import { useState, useCallback } from 'react';
import type { TryMellonError } from '../errors';
import type { Result } from '../utils/result';

export type UseActionState<TResult> = {
    result: Result<TResult, TryMellonError> | null;
    loading: boolean;
    error: TryMellonError | null;
};

export function useTryMellonAction<TOptions, TResult>(
    action: (options: TOptions) => Promise<Result<TResult, TryMellonError>>
) {
    const [state, setState] = useState<UseActionState<TResult>>({
        result: null,
        loading: false,
        error: null,
    });

    const execute = useCallback(
        async (options: TOptions) => {
            setState((s) => ({ ...s, loading: true, error: null, result: null }));
            const result = await action(options);
            setState({
                result,
                loading: false,
                error: result.ok ? null : result.error,
            });
            return result;
        },
        [action]
    );

    return {
        result: state.result,
        loading: state.loading,
        error: state.error,
        execute,
    };
}
