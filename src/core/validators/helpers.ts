import type { Result } from '../../utils/result';
import { err } from '../../utils/result';
import { createError, type TryMellonError } from '../../errors';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function validationError(
  message: string,
  details?: { field?: string; expected?: string; originalData?: unknown }
): Result<never, TryMellonError> {
  return err(
    createError('NETWORK_FAILURE', message, {
      ...details,
      originalData: details?.originalData,
    })
  );
}

export function required(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

export function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return v === undefined ? undefined : typeof v === 'string' ? v : undefined;
}
