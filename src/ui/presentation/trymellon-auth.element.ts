/**
 * Web Component <trymellon-auth>. Shadow DOM open + attributes + render by state.
 * Option A (default): action=open-modal without trigger-only → emits mellon:open-request and shows internal modal.
 * Option B (escape hatch): trigger-only="true" → only emits mellon:open-request; host mounts <trymellon-auth-modal> separately.
 */
import type { TabKind } from '../domain/types';
import type { RunEnvEvalParams } from '../application/evaluate-env.use-case';
import { authUiApplicationService } from '../application/auth-ui.application-service';
import { parseAttributesFromElement } from '../adapters/attributes/inline.adapter';
import type { ParsedAttributes } from '../adapters/attributes/inline.adapter';
import { DEFAULT_PARSED_ATTRIBUTES } from '../domain/contracts/constants';
import { buildAuthButtonViewModel } from '../domain/auth-viewmodels';
import { renderAuthButton } from '../adapters/render/auth.adapter';
import { registerAuthButtonInteractions } from '../adapters/interactions/dom.adapter';
import type { IRenderSurface } from '../ports/render.port';
import {
  createConstructableStylesheet,
  getStylesFallback,
} from '../adapters/render/styles.adapter';
import type { MellonFallbackDetail } from '../ports';
import { toCoreAuthOptions } from '../adapters/infra/core-factory.adapter';
import { MELLON_CLOSE, MELLON_SUCCESS } from '../adapters/infra/event-bridge.adapter';
import { AuthElementBase } from './auth-element-base';
import { TryMellonAuthModalElement } from './trymellon-auth-modal.element';
import { OBSERVED_ATTRIBUTES_AUTH } from './constants';
import { MELLON_OPEN_REQUEST } from './ui-events';

export class TryMellonAuthElement extends AuthElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES_AUTH];
  }

  protected _parsed: ParsedAttributes = { ...DEFAULT_PARSED_ATTRIBUTES };
  private _internalModal: TryMellonAuthModalElement | null = null;
  /** Element that opened the modal; single source for focus restore on close. */
  private _focusRestoreTarget: Element | null = null;
  private _unregisterInteractions: (() => void) | null = null;

  private _onInternalModalClose = (): void => {
    if (this._internalModal) this._internalModal.open = false;
    this._restoreFocusToTrigger();
  };

  /** Re-dispatch modal success on this element so host can listen on <trymellon-auth> (modal is in body, events don't bubble here). */
  private _onInternalModalSuccess = (e: Event): void => {
    const ev = e as CustomEvent;
    this.dispatchEvent(
      new CustomEvent(MELLON_SUCCESS, {
        detail: ev.detail,
        bubbles: false,
        composed: true,
      })
    );
  };

  private _restoreFocusToTrigger(): void {
    const el = this._focusRestoreTarget;
    this._focusRestoreTarget = null;
    if (!el?.isConnected || typeof (el as HTMLElement).focus !== 'function') return;
    (el as HTMLElement).focus();
  }

  connectedCallback(): void {
    if (this.shadowRoot) {
      this._registerInteractions();
      if (this._core !== null && this._unsubscribeBridge === null) {
        this.attachCore(this._core);
      }
      this._syncInternalModalAttributes();
      this._ensureInternalModal();
      return;
    }
    const shadow = this.attachShadow({ mode: 'open' });

    const sheet = createConstructableStylesheet();
    if (sheet) {
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const styleEl = document.createElement('style');
      styleEl.textContent = getStylesFallback();
      shadow.appendChild(styleEl);
    }

    this._parsed = parseAttributesFromElement(this);
    this._syncThemeAttribute();
    this._registerInteractions();
    this._render();
    this._reconcileCoreFromConfig();
    this._ensureInternalModal();
  }

  private _registerInteractions(): void {
    if (!this.shadowRoot) return;
    this._unregisterInteractions?.();
    this._unregisterInteractions = registerAuthButtonInteractions(this.shadowRoot, {
      onPrimaryClick: () => this._onPrimaryClick(),
      onFallbackClick: (type?: 'email' | 'qr') => this.dispatchFallback(type),
    });
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (!this.shadowRoot) return;
    const prevMode = this._parsed.mode;
    this._parsed = parseAttributesFromElement(this);
    if (name === 'button-variant' || name === 'theme') {
      this.invalidateRender();
    }
    if (name === 'app-id' || name === 'publishable-key') {
      this._reconcileCoreFromConfig();
    }
    if (name === 'mode' && (this._parsed.mode === 'register' || this._parsed.mode === 'login')) {
      const tab = this._parsed.mode;
      if (prevMode !== tab) {
        this._emitCancelledIfAuthenticating();
        this.setState(authUiApplicationService.tabChange(this.currentState, tab));
      }
    }
    this._syncThemeAttribute();
    this.scheduleRenderIfNeeded();
    this._syncInternalModalAttributes();
    this._ensureInternalModal();
  }

  private _onPrimaryClick(): void {
    if (this._parsed.action === 'open-modal') {
      this._focusRestoreTarget =
        document.activeElement instanceof Element ? document.activeElement : null;
      this.dispatchEvent(
        new CustomEvent(MELLON_OPEN_REQUEST, { detail: {}, bubbles: true, composed: true })
      );
      if (!this._parsed.triggerOnly && this._internalModal) this._internalModal.open = true;
      return;
    }
    this.startAuthFromClick();
  }

  protected getTabKind(): TabKind {
    return this._parsed.mode === 'auto' ? 'login' : this._parsed.mode;
  }

  protected getCoreAuthOptions(): { externalUserId?: string | null } {
    return toCoreAuthOptions(this._parsed.externalUserId);
  }

  protected canStartAuth(): boolean {
    return true;
  }

  protected getEnvEvalParams(): Omit<RunEnvEvalParams, 'envStatusPort' | 'currentState'> {
    return { mode: this._parsed.mode };
  }

  protected getCoreConfig(): { appId: string; publishableKey: string } | null {
    if (!this._parsed.appId || !this._parsed.publishableKey) return null;
    return { appId: this._parsed.appId, publishableKey: this._parsed.publishableKey };
  }

  protected getFallbackDetail(): MellonFallbackDetail {
    const operation =
      this._parsed.mode === 'login' || this._parsed.mode === 'register'
        ? this._parsed.mode
        : undefined;
    return operation !== undefined ? { operation } : {};
  }

  protected _render(): void {
    if (!this.shadowRoot) return;
    const vm = buildAuthButtonViewModel(this.currentState, this._parsed, {
      registerSessionReady: this._parsed.mode === 'register' ? this.canStartAuth() : undefined,
      primaryButtonLabel: this._parsed.buttonLabel ?? undefined,
      primaryButtonAriaLabel: this._parsed.buttonAriaLabel ?? undefined,
    });
    const surface: IRenderSurface = { shadowRoot: this.shadowRoot };
    renderAuthButton(surface, vm);
  }

  private _syncThemeAttribute(): void {
    if (this.getAttribute('theme') !== this._parsed.theme) {
      this.setAttribute('theme', this._parsed.theme);
    }
  }

  private _syncInternalModalAttributes(): void {
    if (!this._internalModal) return;
    this._internalModal.setAttribute('app-id', this._parsed.appId ?? '');
    this._internalModal.setAttribute('publishable-key', this._parsed.publishableKey ?? '');
    this._internalModal.setAttribute('theme', this._parsed.theme);
    const tab = this._parsed.mode === 'auto' ? 'login' : this._parsed.mode;
    this._internalModal.setAttribute('tab', tab);
    /** Opaque panel (avoids transparent look when host CSS vars don't reach body-portaled modal). */
    this._internalModal.setAttribute('modal-variant', 'minimal');
  }

  private _ensureInternalModal(): void {
    if (this._parsed.action !== 'open-modal' || !this.shadowRoot) return;
    if (this._parsed.triggerOnly) {
      if (this._internalModal?.isConnected) {
        this._internalModal.removeEventListener(MELLON_CLOSE, this._onInternalModalClose);
        this._internalModal.remove();
        this._internalModal = null;
      }
      return;
    }
    if (this._internalModal?.isConnected) {
      this._syncInternalModalAttributes();
      return;
    }
    const modal = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    this._internalModal = modal;
    this._syncInternalModalAttributes();
    modal.addEventListener(MELLON_CLOSE, this._onInternalModalClose);
    modal.addEventListener(MELLON_SUCCESS, this._onInternalModalSuccess);
    // Portal to body so overlay covers viewport; ancestors with transform/filter/backdrop-filter
    // would otherwise create a containing block and trap position:fixed (modal off to the side).
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(modal);
    } else {
      this.shadowRoot.appendChild(modal);
    }
  }

  override disconnectedCallback(): void {
    this._unregisterInteractions?.();
    this._unregisterInteractions = null;
    if (this._internalModal?.isConnected) {
      this._internalModal.removeEventListener(MELLON_CLOSE, this._onInternalModalClose);
      this._internalModal.removeEventListener(MELLON_SUCCESS, this._onInternalModalSuccess);
      this._internalModal.remove();
      this._internalModal = null;
    }
    super.disconnectedCallback();
  }
}
