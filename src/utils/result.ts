export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function map<T, E, U>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(mapper(result.value));
  }
  return result;
}

export function mapErr<T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> {
  if (!result.ok) {
    return err(mapper(result.error));
  }
  return result;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}
