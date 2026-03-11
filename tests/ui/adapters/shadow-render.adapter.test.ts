import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  MELLON_ROOT_ID,
  MODAL_PASSKEY_BUTTON_LABEL,
  MODAL_PASSKEY_ARIA_LABEL,
} from '../../../src/ui/adapters/render/shadow.adapter';
import type { IRenderSurface } from '../../../src/ui/ports/render.port';

function createSurface(): IRenderSurface {
  const host = document.createElement('div');
  const shadowRoot = host.attachShadow({ mode: 'open' });
  return { shadowRoot };
}

describe('ui/adapters/shadow-render.adapter', () => {
  let surface: IRenderSurface;

  beforeEach(() => {
    surface = createSurface();
  });

  it('creates #mellon-root when missing and renders loading for invalid state', () => {
    render(surface, 'UNKNOWN_STATE');
    const root = surface.shadowRoot.getElementById(MELLON_ROOT_ID);
    expect(root).not.toBeNull();
    expect(root?.querySelector('.mellon-loading')?.textContent).toContain('Loading');
  });

  it('renders Loading… for IDLE and EVALUATING_ENV', () => {
    render(surface, 'IDLE', {});
    const loading = surface.shadowRoot.querySelector('.mellon-loading');
    expect(loading?.textContent).toContain('Loading');

    render(surface, 'EVALUATING_ENV', {});
    const loadingEnv = surface.shadowRoot.querySelector('.mellon-loading');
    expect(loadingEnv?.textContent).toContain('Loading');
  });

  it('renders primary button (icon + TryMellon) for READY_LOGIN and READY_REGISTER', () => {
    render(surface, 'READY_LOGIN', { mode: 'login' });
    const btnLogin = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btnLogin?.tagName).toBe('BUTTON');
    expect(btnLogin?.textContent).toContain('TryMellon');
    expect(btnLogin?.querySelector('.mellon-btn-icon')).not.toBeNull();

    render(surface, 'READY_REGISTER', { mode: 'register' });
    const btnRegister = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btnRegister?.tagName).toBe('BUTTON');
    expect(btnRegister?.textContent).toContain('TryMellon');
    expect(btnRegister?.querySelector('.mellon-btn-icon')).not.toBeNull();
  });

  it('renders pill variant with mellon-btn-pill and icon circle when buttonVariant is pill', () => {
    render(surface, 'READY_LOGIN', { mode: 'login', buttonVariant: 'pill' });
    const btn = surface.shadowRoot.querySelector('button.mellon-btn.mellon-btn-pill');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-label')).toBe('TryMellon, open authentication');
    const iconCircle = btn?.querySelector('.mellon-btn-pill-icon-circle');
    expect(iconCircle).not.toBeNull();
    expect(iconCircle?.querySelector('.mellon-btn-icon')).not.toBeNull();
    expect(btn?.textContent).toContain('TryMellon');
  });

  it('renders modal passkey label when primaryButtonLabel is passed (modal context)', () => {
    render(surface, 'READY_LOGIN', {
      mode: 'login',
      primaryButtonLabel: MODAL_PASSKEY_BUTTON_LABEL,
      primaryButtonAriaLabel: MODAL_PASSKEY_ARIA_LABEL,
    });
    const btn = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btn?.textContent).toContain(MODAL_PASSKEY_BUTTON_LABEL);
    expect(btn?.getAttribute('aria-label')).toBe(MODAL_PASSKEY_ARIA_LABEL);
  });

  it('renders default button (no pill class) when buttonVariant is default or omitted', () => {
    render(surface, 'READY_LOGIN', { mode: 'login', buttonVariant: 'default' });
    const btnDefault = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btnDefault?.classList.contains('mellon-btn-pill')).toBe(false);
    render(surface, 'READY_LOGIN', { mode: 'login' });
    const btnOmitted = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btnOmitted?.classList.contains('mellon-btn-pill')).toBe(false);
  });

  it('renders "Preparando registro…" for READY_REGISTER when registerSessionReady is false', () => {
    render(surface, 'READY_REGISTER', { mode: 'register', registerSessionReady: false });
    const loading = surface.shadowRoot.querySelector('.mellon-loading');
    expect(loading?.textContent).toContain('Preparando registro');
    const btn = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btn).toBeNull();
  });

  it('renders Authenticating… for AUTHENTICATING', () => {
    render(surface, 'AUTHENTICATING', {});
    const loading = surface.shadowRoot.querySelector('.mellon-loading');
    expect(loading?.textContent).toContain('Authenticating');
  });

  it('renders error message for ERROR', () => {
    render(surface, 'ERROR', {});
    const msg = surface.shadowRoot.querySelector('.mellon-message');
    expect(msg?.textContent).toContain('Something went wrong');
  });

  it('renders main button for READY_LOGIN/READY_REGISTER and updates content per state', () => {
    render(surface, 'READY_LOGIN', { mode: 'login' });
    let btn = surface.shadowRoot.querySelector('button.mellon-btn');
    expect(btn).not.toBeNull();

    render(surface, 'SUCCESS', { mode: 'login' });
    btn = surface.shadowRoot.querySelector('button.mellon-btn');
    const msg = surface.shadowRoot.querySelector('.mellon-message');
    expect(btn).toBeNull();
    expect(msg?.textContent).toContain('Success');
  });

  it('renders fallback UI with correct buttons for different fallback states', () => {
    render(surface, 'FALLBACK', {});
    let fallback = surface.shadowRoot.querySelector('.mellon-fallback');
    expect(fallback).not.toBeNull();

    render(surface, 'FALLBACK_EMAIL', {});
    fallback = surface.shadowRoot.querySelector('.mellon-fallback');
    const emailBtn = fallback?.querySelector('button[data-mellon-action="fallback-email"]');
    expect(emailBtn).not.toBeNull();

    render(surface, 'FALLBACK_QR', {});
    fallback = surface.shadowRoot.querySelector('.mellon-fallback');
    const qrBtn = fallback?.querySelector('button[data-mellon-action="fallback-qr"]');
    expect(qrBtn).not.toBeNull();
  });
});
