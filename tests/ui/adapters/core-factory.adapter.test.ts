import { describe, it, expect, vi } from 'vitest';
import {
  createCoreForUI,
  isCoreAuthPort,
  toCoreAuthOptions,
} from '../../../src/ui/adapters/infra/core-factory.adapter';
import { TryMellon } from '../../../src/core/trymellon';
import type { Result } from '../../../src/utils/result';
import type { TryMellonError } from '../../../src/errors';

describe('ui/adapters/core-factory.adapter', () => {
  it('isCoreAuthPort returns true for object implementing CoreAuthPort surface', () => {
    const candidate = {
      authenticate: vi.fn(),
      register: vi.fn(),
      on: vi.fn(),
      enroll: vi.fn(),
      getContextHash: vi.fn(),
    };
    expect(isCoreAuthPort(candidate)).toBe(true);
  });

  it('isCoreAuthPort returns false when any method is missing', () => {
    expect(isCoreAuthPort({ authenticate: vi.fn(), register: vi.fn() })).toBe(false);
    expect(isCoreAuthPort({ authenticate: vi.fn(), on: vi.fn() })).toBe(false);
    expect(isCoreAuthPort({ register: vi.fn(), on: vi.fn() })).toBe(false);
    expect(
      isCoreAuthPort({
        authenticate: vi.fn(),
        register: vi.fn(),
        on: vi.fn(),
        enroll: vi.fn(),
      })
    ).toBe(false);
    expect(
      isCoreAuthPort({
        authenticate: vi.fn(),
        register: vi.fn(),
        on: vi.fn(),
        getContextHash: vi.fn(),
      })
    ).toBe(false);
    expect(isCoreAuthPort(null)).toBe(false);
  });

  it('createCoreForUI returns null when TryMellon.create fails', () => {
    const spy = vi
      .spyOn(TryMellon, 'create')
      .mockReturnValueOnce({ ok: false, error: new Error('invalid config') } as Result<
        TryMellon,
        TryMellonError
      >);

    const result = createCoreForUI({ appId: 'app_x', publishableKey: 'pk_x' });
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('createCoreForUI returns CoreAuthPort-compatible instance on success', () => {
    const coreMock = {
      authenticate: vi.fn(),
      register: vi.fn(),
      on: vi.fn(),
      enroll: vi.fn(),
      getContextHash: vi.fn(),
    };
    const spy = vi
      .spyOn(TryMellon, 'create')
      .mockReturnValueOnce({ ok: true, value: coreMock as unknown as TryMellon } as Result<
        TryMellon,
        TryMellonError
      >);

    const result = createCoreForUI({ appId: 'app_x', publishableKey: 'pk_x' });
    expect(spy).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(isCoreAuthPort(result)).toBe(true);
  });

  it('toCoreAuthOptions maps non-null externalUserId and omits when null', () => {
    expect(toCoreAuthOptions('user_1')).toEqual({ externalUserId: 'user_1' });
    expect(toCoreAuthOptions(null)).toEqual({});
  });
});
