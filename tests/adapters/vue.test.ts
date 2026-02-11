import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { provideTryMellon, useTryMellon, useRegister, useAuthenticate } from '../../src/vue';

describe('Vue adapter', () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provideTryMellon and useRegister: execute calls client.register', async () => {
    const mockClient = {
      register: mockRegister,
      authenticate: vi.fn(),
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      fallback: { email: { start: vi.fn(), verify: vi.fn() } },
      onboarding: {},
    } as never;

    mockRegister.mockResolvedValue({
      ok: true,
      value: {
        success: true,
        credential_id: 'c1',
        status: 'verified',
        session_token: 't1',
        user: { user_id: 'u1', external_user_id: 'user_123' },
      },
    });

    const TestComponent = defineComponent({
      setup() {
        provideTryMellon(mockClient);
        return () => h(ChildComponent);
      },
    });

    const ChildComponent = defineComponent({
      setup() {
        const { execute, result } = useRegister();
        return () =>
          h('div', [
            h(
              'button',
              {
                onClick: () => execute({ externalUserId: 'user_123' }),
              },
              'Register'
            ),
            result.value?.ok ? h('span', { 'data-testid': 'success' }, 'OK') : null,
          ]);
      },
    });

    const wrapper = mount(TestComponent);
    await wrapper.find('button').trigger('click');
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    });
    expect(wrapper.find('[data-testid="success"]').exists()).toBe(true);
  });

  it('provideTryMellon and useAuthenticate: execute calls client.authenticate and sets result', async () => {
    const mockAuthenticate = vi.fn();
    const mockClient = {
      register: vi.fn(),
      authenticate: mockAuthenticate,
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      fallback: { email: { start: vi.fn(), verify: vi.fn() } },
      onboarding: {},
    } as never;

    mockAuthenticate.mockResolvedValue({
      ok: true,
      value: {
        session_token: 'st_1',
        user: { user_id: 'u1', external_user_id: 'user_456' },
      },
    });

    const TestAuthComponent = defineComponent({
      setup() {
        provideTryMellon(mockClient);
        return () => h(AuthChildComponent);
      },
    });

    const AuthChildComponent = defineComponent({
      setup() {
        const { execute, result } = useAuthenticate();
        return () =>
          h('div', [
            h('button', { onClick: () => execute({ externalUserId: 'user_456' }) }, 'Authenticate'),
            result.value?.ok ? h('span', { 'data-testid': 'auth-success' }, 'OK') : null,
          ]);
      },
    });

    const wrapper = mount(TestAuthComponent);
    await wrapper.find('button').trigger('click');
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(mockAuthenticate).toHaveBeenCalledWith({ externalUserId: 'user_456' });
    });
    expect(wrapper.find('[data-testid="auth-success"]').exists()).toBe(true);
  });

  it('useAuthenticate: error state when authenticate returns err', async () => {
    const mockAuthenticate = vi.fn();
    const mockClient = {
      register: vi.fn(),
      authenticate: mockAuthenticate,
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      fallback: { email: { start: vi.fn(), verify: vi.fn() } },
      onboarding: {},
    } as never;

    mockAuthenticate.mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK_FAILURE', message: 'Auth failed' },
    });

    const TestAuthComponent = defineComponent({
      setup() {
        provideTryMellon(mockClient);
        return () => h(AuthChildComponent);
      },
    });

    const AuthChildComponent = defineComponent({
      setup() {
        const { execute, error } = useAuthenticate();
        return () =>
          h('div', [
            h('button', { onClick: () => execute({ externalUserId: 'x' }) }, 'Authenticate'),
            error.value ? h('span', { 'data-testid': 'auth-error' }, error.value.message) : null,
          ]);
      },
    });

    const wrapper = mount(TestAuthComponent);
    await wrapper.find('button').trigger('click');
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="auth-error"]').exists()).toBe(true);
    });
    expect(wrapper.find('[data-testid="auth-error"]').text()).toBe('Auth failed');
  });

  it('useTryMellon throws when used without provideTryMellon', () => {
    const Child = defineComponent({
      setup() {
        expect(() => useTryMellon()).toThrow(/provideTryMellon/);
        return () => h('div');
      },
    });
    mount(Child);
  });
});
