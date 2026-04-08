import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import {
  provideTryMellon,
  useTryMellon,
  useSignUp,
  useSignIn,
  useEnroll,
} from '../../src/vue';

describe('Vue adapter', () => {
  const mockSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provideTryMellon and useSignUp: execute calls client.signUp', async () => {
    const mockClient = {
      signUp: mockSignUp,
      signIn: vi.fn(),
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      otp: { send: vi.fn(), verify: vi.fn() },
      onboarding: {},
    } as never;

    mockSignUp.mockResolvedValue({
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
        const { execute, result } = useSignUp();
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
      expect(mockSignUp).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    });
    expect(wrapper.find('[data-testid="success"]').exists()).toBe(true);
  });

  it('provideTryMellon and useSignIn: execute calls client.signIn and sets result', async () => {
    const mockSignIn = vi.fn();
    const mockClient = {
      signUp: vi.fn(),
      signIn: mockSignIn,
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      otp: { send: vi.fn(), verify: vi.fn() },
      onboarding: {},
    } as never;

    mockSignIn.mockResolvedValue({
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
        const { execute, result } = useSignIn();
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
      expect(mockSignIn).toHaveBeenCalledWith({ externalUserId: 'user_456' });
    });
    expect(wrapper.find('[data-testid="auth-success"]').exists()).toBe(true);
  });

  it('useSignIn: error state when signIn returns err', async () => {
    const mockSignIn = vi.fn();
    const mockClient = {
      signUp: vi.fn(),
      signIn: mockSignIn,
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      otp: { send: vi.fn(), verify: vi.fn() },
      onboarding: {},
    } as never;

    mockSignIn.mockResolvedValue({
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
        const { execute, error } = useSignIn();
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

  it('provideTryMellon and useEnroll: execute calls client.enroll, contextHash from getContextHash', async () => {
    const mockAccept = vi.fn();
    const mockGetContextHash = vi.fn().mockReturnValue('vue_ctx_hash');
    const mockClient = {
      signUp: vi.fn(),
      signIn: vi.fn(),
      enroll: mockAccept,
      getContextHash: mockGetContextHash,
      validateSession: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      version: vi.fn(() => '0.1.0'),
      otp: { send: vi.fn(), verify: vi.fn() },
      onboarding: {},
    } as never;

    mockAccept.mockResolvedValue({
      ok: true,
      value: { sessionToken: 'st_vue_enroll' },
    });

    const EnrollChild = defineComponent({
      setup() {
        const { execute, result, contextHash } = useEnroll();
        return () =>
          h('div', [
            h('span', { 'data-testid': 'vue-context-hash' }, contextHash.value),
            h('button', { onClick: () => execute({ ticketId: 'tk_1' }) }, 'Enroll'),
            result.value?.ok ? h('span', { 'data-testid': 'vue-enroll-ok' }, 'OK') : null,
          ]);
      },
    });

    const TestEnrollComponent = defineComponent({
      setup() {
        provideTryMellon(mockClient);
        return () => h(EnrollChild);
      },
    });

    const wrapper = mount(TestEnrollComponent);
    expect(wrapper.find('[data-testid="vue-context-hash"]').text()).toBe('vue_ctx_hash');
    expect(mockGetContextHash).toHaveBeenCalled();

    await wrapper.find('button').trigger('click');
    await wrapper.vm.$nextTick();
    await vi.waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith({ ticketId: 'tk_1' });
    });
    expect(wrapper.find('[data-testid="vue-enroll-ok"]').exists()).toBe(true);
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
