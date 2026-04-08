import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TryMellonProvider, useSignUp, useSignIn, useEnroll } from '../../src/react';

function TestComponent() {
  const { execute, loading, result } = useSignUp();
  return (
    <div>
      <button
        type="button"
        onClick={() => execute({ externalUserId: 'user_123' })}
        disabled={loading}
      >
        Register
      </button>
      {result?.ok && <span data-testid="success">OK</span>}
    </div>
  );
}

function TestAuthenticateComponent() {
  const { execute, loading, result, error } = useSignIn();
  return (
    <div>
      <button
        type="button"
        onClick={() => execute({ externalUserId: 'user_456' })}
        disabled={loading}
      >
        Authenticate
      </button>
      {loading && <span data-testid="loading">loading</span>}
      {result?.ok && <span data-testid="auth-success">OK</span>}
      {error && <span data-testid="auth-error">{error.message}</span>}
    </div>
  );
}

describe('React adapter', () => {
  const mockSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TryMellonProvider and useSignUp: execute calls client.signUp', async () => {
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

    render(
      <TryMellonProvider client={mockClient}>
        <TestComponent />
      </TryMellonProvider>
    );

    const button = screen.getByRole('button', { name: /register/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('success').textContent).toBe('OK');
    });
  });

  it('TryMellonProvider and useSignIn: execute calls client.signIn and sets loading/result/error', async () => {
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

    render(
      <TryMellonProvider client={mockClient}>
        <TestAuthenticateComponent />
      </TryMellonProvider>
    );

    const button = screen.getByRole('button', { name: /authenticate/i });
    expect(screen.queryByTestId('loading')).toBeNull();
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({ externalUserId: 'user_456' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-success').textContent).toBe('OK');
    });
    expect(screen.queryByTestId('loading')).toBeNull();
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
      error: { code: 'NETWORK_FAILURE', message: 'Network error' },
    });

    render(
      <TryMellonProvider client={mockClient}>
        <TestAuthenticateComponent />
      </TryMellonProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /authenticate/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error').textContent).toBe('Network error');
    });
  });

  it('TryMellonProvider and useEnroll: execute calls client.enroll, contextHash from getContextHash', async () => {
    const mockAccept = vi.fn();
    const mockGetContextHash = vi.fn().mockReturnValue('ctx_hash_abc');
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
      value: { sessionToken: 'st_enroll_1' },
    });

    function EnrollComponent() {
      const { execute, loading, result, contextHash } = useEnroll();
      return (
        <div>
          <span data-testid="context-hash">{contextHash}</span>
          <button
            type="button"
            onClick={() => execute({ ticketId: 'ticket_1' })}
            disabled={loading}
          >
            Enroll
          </button>
          {result?.ok && <span data-testid="enroll-success">OK</span>}
        </div>
      );
    }

    render(
      <TryMellonProvider client={mockClient}>
        <EnrollComponent />
      </TryMellonProvider>
    );

    expect(screen.getByTestId('context-hash').textContent).toBe('ctx_hash_abc');
    expect(mockGetContextHash).toHaveBeenCalled();

    const button = screen.getByRole('button', { name: /enroll/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith({ ticketId: 'ticket_1' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('enroll-success').textContent).toBe('OK');
    });
  });
});
