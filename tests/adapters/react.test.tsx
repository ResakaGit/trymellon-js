import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TryMellonProvider, useRegister, useAuthenticate } from '../../src/react';

function TestComponent() {
  const { execute, loading, result } = useRegister();
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
  const { execute, loading, result, error } = useAuthenticate();
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
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TryMellonProvider and useRegister: execute calls client.register', async () => {
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

    render(
      <TryMellonProvider client={mockClient}>
        <TestComponent />
      </TryMellonProvider>
    );

    const button = screen.getByRole('button', { name: /register/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('success').textContent).toBe('OK');
    });
  });

  it('TryMellonProvider and useAuthenticate: execute calls client.authenticate and sets loading/result/error', async () => {
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

    render(
      <TryMellonProvider client={mockClient}>
        <TestAuthenticateComponent />
      </TryMellonProvider>
    );

    const button = screen.getByRole('button', { name: /authenticate/i });
    expect(screen.queryByTestId('loading')).toBeNull();
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAuthenticate).toHaveBeenCalledWith({ externalUserId: 'user_456' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('auth-success').textContent).toBe('OK');
    });
    expect(screen.queryByTestId('loading')).toBeNull();
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
});
