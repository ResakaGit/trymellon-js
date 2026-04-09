/**
 * Web Component <trymellon-auth-modal>. Public API per 01-limites-api-publica.md.
 * Extends AuthElementBase; attributes, parsing, modal structure, open/tab and _render only.
 */
import type { UIState, TabKind } from '../domain/types';
import { tabToUIMode } from '../domain/types';
import type { RunEnvEvalParams } from '../application/evaluate-env.use-case';
import { authUiApplicationService } from '../application/auth-ui.application-service';
import type { ParsedModalAttributes } from '../adapters/attributes/modal.adapter';
import { parseModalAttributesFromElement } from '../adapters/attributes/modal.adapter';
import { ensureModalStructure } from '../adapters/render/modal-structure.adapter';
import { createFocusTrap, type FocusTrapHandle } from '../adapters/interactions/focus-trap.adapter';
import { buildAuthModalViewModel } from '../domain/auth-viewmodels';
import { renderAuthModal } from '../adapters/render/auth.adapter';
import { registerAuthModalInteractions } from '../adapters/interactions/dom.adapter';
import { MODAL_PASSKEY_ARIA_LABEL, MODAL_PASSKEY_BUTTON_LABEL } from '../adapters/render/constants';
import {
  createModalConstructableStylesheet,
  getModalStylesFallback,
} from '../adapters/render/styles.adapter';
import type { IRenderSurface } from '../ports/render.port';
import type { MellonCloseDetail, MellonFallbackDetail, MellonOpenDetail } from '../ports';
import {
  createMellonCloseEvent,
  createMellonOpenEvent,
  createMellonTabChangeEvent,
} from './ui-events';
import { AuthElementBase } from './auth-element-base';
import {
  OBSERVED_ATTRIBUTES_MODAL,
  MODAL_SELECTORS,
  MELLON_CLOSE_REASON_DEFAULT,
} from './constants';
import {
  CROSS_DEVICE_WRAP_CLASS,
  SLOT_CROSS_DEVICE,
  QR_LOAD_TIMEOUT_MS_DEFAULT,
} from '../adapters/render/constants';

/** State → close reason. Lookup only; default handles all unmapped states (good taste: no special-case ifs). */
const CLOSE_REASON_BY_STATE: Partial<Record<UIState, MellonCloseDetail>> = {
  SUCCESS: { reason: 'success' },
  AUTHENTICATING: { reason: 'cancel' },
  ERROR: { reason: 'error' },
};

function closeDetailFromState(state: UIState): MellonCloseDetail {
  const mapped = CLOSE_REASON_BY_STATE[state];
  return mapped ?? { reason: MELLON_CLOSE_REASON_DEFAULT };
}

export class TryMellonAuthModalElement extends AuthElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES_MODAL];
  }

  protected _parsed: ParsedModalAttributes = parseModalAttributesFromElement(this as HTMLElement);
  private _focusTrap: FocusTrapHandle | null = null;
  private _unregisterInteractions: (() => void) | null = null;
  /** When external-user-id is not set, register uses this UUID so backend can notify client without external UI. */
  private _generatedExternalUserId: string | null = null;
  private _qrLoadTimeoutId: number | null = null;
  private _qrSlotChangeBound: (() => void) | null = null;

  /** Escape closes modal via same path as open=false → _transitionToIdle. */
  private _boundEscapeKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (!this._parsed.open) return;
    e.preventDefault();
    this.open = false;
  };

  connectedCallback(): void {
    this.addEventListener('keydown', this._boundEscapeKeydown, true);
    if (this.shadowRoot) {
      this._registerInteractions();
      if (this._core !== null && this._unsubscribeBridge === null) {
        this.attachCore(this._core);
      }
      return;
    }

    const shadow = this.attachShadow({ mode: 'open' });

    const sheet = createModalConstructableStylesheet();
    if (sheet) {
      shadow.adoptedStyleSheets = [sheet];
    } else {
      const styleEl = document.createElement('style');
      styleEl.textContent = getModalStylesFallback();
      shadow.appendChild(styleEl);
    }

    this._parsed = parseModalAttributesFromElement(this);
    ensureModalStructure(shadow, this._parsed);
    this._registerInteractions();
    this._render();
    this._applyModalVisibility();
    this._maybeAutoCreateCoreAndRunEnvEval();
  }

  private _registerInteractions(): void {
    if (!this.shadowRoot) return;
    this._unregisterInteractions?.();
    this._unregisterInteractions = registerAuthModalInteractions(this.shadowRoot, {
      onTabChange: (tab) => {
        this.dispatchEvent(createMellonTabChangeEvent({ tab }));
        this.setAttribute('tab', tab);
      },
      onPrimaryClick: () => this.startAuthFromClick(),
      onFallbackClick: (type) => this.dispatchFallback(type),
      onOverlayClick: () => {
        this.open = false;
      },
      onCloseClick: () => {
        this.open = false;
      },
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null): void {
    if (!this.shadowRoot) return;
    this._parsed = parseModalAttributesFromElement(this);
    if (name === 'open') {
      if (this._parsed.open && oldValue !== 'true') {
        this._clearCrossDeviceSlot();
        const detail: MellonOpenDetail = { timestamp: Date.now() };
        this.dispatchEvent(createMellonOpenEvent(detail));
        this._startQrLoadWait();
      }
      if (!this._parsed.open) {
        this._clearQrLoadWait();
        this._transitionToIdle();
        return;
      }
    }
    if (name === 'tab') {
      this._emitCancelledIfAuthenticating();
      this.setState(authUiApplicationService.tabChange(this.currentState, this._parsed.tab));
    }
    if (name === 'app-id' || name === 'publishable-key') {
      this._reconcileCoreFromConfig();
    }
    ensureModalStructure(this.shadowRoot, this._parsed);
    this._render();
    this._applyModalVisibility();
  }

  /** Clear any host-injected cross-device slot content so each open starts with a clean slot (avoids stacked QRs). */
  private _clearCrossDeviceSlot(): void {
    this.querySelectorAll(`[slot="${SLOT_CROSS_DEVICE}"]`).forEach((el) => el.remove());
  }

  private _startQrLoadWait(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const wrap = root.querySelector<HTMLElement>(`.${CROSS_DEVICE_WRAP_CLASS}`);
    const slot = root.querySelector<HTMLSlotElement>(`slot[name="${SLOT_CROSS_DEVICE}"]`);
    if (!wrap || !slot) return;
    wrap.setAttribute('data-qr-area-state', 'waiting');
    const ms = Math.max(
      1000,
      parseInt(this.getAttribute('qr-load-timeout-ms') ?? String(QR_LOAD_TIMEOUT_MS_DEFAULT), 10) ||
        QR_LOAD_TIMEOUT_MS_DEFAULT
    );
    this._qrLoadTimeoutId = window.setTimeout(() => {
      this._qrLoadTimeoutId = null;
      if (!this.shadowRoot) return;
      const wrapElement = this.shadowRoot.querySelector<HTMLElement>(`.${CROSS_DEVICE_WRAP_CLASS}`);
      if (wrapElement?.getAttribute('data-qr-area-state') === 'waiting') {
        wrapElement.setAttribute('data-qr-area-state', 'timeout');
      }
    }, ms);
    const onSlotChange = (): void => {
      if (slot.assignedNodes().length > 0) {
        this._clearQrLoadWait();
        const w = this.shadowRoot?.querySelector<HTMLElement>(`.${CROSS_DEVICE_WRAP_CLASS}`);
        if (w) w.setAttribute('data-qr-area-state', 'loaded');
      }
    };
    this._qrSlotChangeBound = onSlotChange;
    slot.addEventListener('slotchange', onSlotChange);
    if (slot.assignedNodes().length > 0) onSlotChange();
  }

  private _clearQrLoadWait(): void {
    if (this._qrLoadTimeoutId != null) {
      clearTimeout(this._qrLoadTimeoutId);
      this._qrLoadTimeoutId = null;
    }
    const root = this.shadowRoot;
    if (!root) return;
    const slot = root.querySelector<HTMLSlotElement>(`slot[name="${SLOT_CROSS_DEVICE}"]`);
    if (slot && this._qrSlotChangeBound) {
      slot.removeEventListener('slotchange', this._qrSlotChangeBound);
    }
    this._qrSlotChangeBound = null;
    const wrap = root.querySelector<HTMLElement>(`.${CROSS_DEVICE_WRAP_CLASS}`);
    if (wrap) wrap.setAttribute('data-qr-area-state', 'default');
  }

  /** Single path to IDLE: close event, cancelled if needed, reset FSM, structure, render, visibility. Called from open→false and reset(). */
  private _transitionToIdle(): void {
    this._generatedExternalUserId = null;
    const closeDetail = closeDetailFromState(this.currentState);
    const detail: MellonCloseDetail = { reason: closeDetail.reason, timestamp: Date.now() };
    this.dispatchEvent(createMellonCloseEvent(detail));
    this._emitCancelledIfAuthenticating();
    this.setState(authUiApplicationService.reset(this.currentState));
    if (!this.shadowRoot) return;
    ensureModalStructure(this.shadowRoot, this._parsed);
    this.scheduleRenderIfNeeded();
    this._applyModalVisibility();
  }

  get open(): boolean {
    return this._parsed.open;
  }
  set open(value: boolean) {
    this.setAttribute('open', value ? 'true' : 'false');
  }

  get mode(): 'modal' | 'inline' {
    return this._parsed.mode;
  }
  set mode(value: 'modal' | 'inline') {
    this.setAttribute('mode', value);
  }

  get tab(): 'register' | 'login' {
    return this._parsed.tab;
  }
  set tab(value: 'register' | 'login') {
    this.setAttribute('tab', value);
  }

  get tabLabels(): string {
    return `${this._parsed.tabLabels.register},${this._parsed.tabLabels.login}`;
  }
  set tabLabels(value: string | undefined) {
    if (value == null || value === '') this.removeAttribute('tab-labels');
    else this.setAttribute('tab-labels', value);
  }

  get theme(): 'light' | 'dark' {
    return this._parsed.theme;
  }
  set theme(value: 'light' | 'dark') {
    this.setAttribute('theme', value);
  }

  get sessionId(): string | null {
    return this._parsed.sessionId;
  }
  set sessionId(value: string | null) {
    if (value == null) this.removeAttribute('session-id');
    else this.setAttribute('session-id', value);
  }

  get onboardingUrl(): string | null {
    return this._parsed.onboardingUrl;
  }
  set onboardingUrl(value: string | null) {
    if (value == null) this.removeAttribute('onboarding-url');
    else this.setAttribute('onboarding-url', value);
  }

  get isMobileOverride(): boolean | null {
    return this._parsed.isMobileOverride;
  }
  set isMobileOverride(value: boolean | null) {
    if (value == null) this.removeAttribute('is-mobile-override');
    else this.setAttribute('is-mobile-override', value ? 'true' : 'false');
  }

  get fallbackType(): 'email' | 'qr' | undefined {
    return this._parsed.fallbackType;
  }
  set fallbackType(value: 'email' | 'qr' | undefined) {
    if (value == null) this.removeAttribute('fallback-type');
    else this.setAttribute('fallback-type', value);
  }

  get appId(): string {
    return this._parsed.appId;
  }
  set appId(value: string) {
    this.setAttribute('app-id', value ?? '');
  }

  get publishableKey(): string {
    return this._parsed.publishableKey;
  }
  set publishableKey(value: string) {
    this.setAttribute('publishable-key', value ?? '');
  }

  get appName(): string | null {
    return this._parsed.appName;
  }
  set appName(value: string | null) {
    if (value == null) this.removeAttribute('app-name');
    else this.setAttribute('app-name', value);
  }

  get dialogTitle(): string | null {
    return this._parsed.dialogTitle;
  }
  set dialogTitle(value: string | null) {
    if (value == null) this.removeAttribute('dialog-title');
    else this.setAttribute('dialog-title', value);
  }

  get dialogDescription(): string | null {
    return this._parsed.dialogDescription;
  }
  set dialogDescription(value: string | null) {
    if (value == null) this.removeAttribute('dialog-description');
    else this.setAttribute('dialog-description', value);
  }

  get externalUserId(): string | null {
    return this._parsed.externalUserId;
  }
  set externalUserId(value: string | null) {
    if (value == null) this.removeAttribute('external-user-id');
    else this.setAttribute('external-user-id', value);
  }

  /**
   * Reset override: transitions to IDLE, clears ceremony and emits `mellon:cancelled` if was AUTHENTICATING.
   * Also emits `mellon:close` with the reason for the current state (success | cancel | error | user).
   * Host must call `reset()` before reopening if the WC stays in the DOM for a clean state.
   */
  override disconnectedCallback(): void {
    this._unregisterInteractions?.();
    this._unregisterInteractions = null;
    this.removeEventListener('keydown', this._boundEscapeKeydown, true);
    super.disconnectedCallback();
  }

  override reset(): void {
    this._transitionToIdle();
  }

  protected getTabKind(): TabKind {
    return this._parsed.tab;
  }

  protected getCoreAuthOptions(): { externalUserId?: string | null } {
    const externalUserId = this._resolveExternalUserId();
    return externalUserId ? { externalUserId } : {};
  }

  /** Single path: explicit attr > generated UUID for register > none. No special-case branches in getCoreAuthOptions. */
  private _resolveExternalUserId(): string | null {
    const explicit = this._parsed.externalUserId?.trim();
    if (explicit) return explicit;
    if (this.getTabKind() !== 'register') return null;
    this._generatedExternalUserId ??=
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : null;
    return this._generatedExternalUserId;
  }

  /** Passkey register is always allowed (external user id optional; SDK uses UUID when not set). */
  protected canStartAuth(): boolean {
    return true;
  }

  protected getEnvEvalParams(): Omit<RunEnvEvalParams, 'envStatusPort' | 'currentState'> {
    return {
      mode: tabToUIMode(this._parsed.tab),
      isMobileOverride: this._parsed.isMobileOverride ?? undefined,
      fallbackType: this._parsed.fallbackType,
    };
  }

  protected getCoreConfig(): { appId: string; publishableKey: string } | null {
    if (!this._parsed.appId || !this._parsed.publishableKey) return null;
    return { appId: this._parsed.appId, publishableKey: this._parsed.publishableKey };
  }

  protected getFallbackDetail(): MellonFallbackDetail {
    return { operation: this._parsed.tab };
  }

  /** Reflects open/mode in DOM (wrapper/overlay hidden). Syncs focus trap: activate when open, deactivate restores focus on close. */
  private _applyModalVisibility(): void {
    if (!this.shadowRoot) return;
    const wrapper = this.shadowRoot.querySelector<HTMLElement>(MODAL_SELECTORS.wrapper);
    if (wrapper) wrapper.hidden = !this._parsed.open;
    const overlay = this.shadowRoot.querySelector<HTMLElement>(MODAL_SELECTORS.overlay);
    if (overlay) overlay.hidden = this._parsed.mode !== 'modal';
    const panel = this.shadowRoot.querySelector<HTMLElement>(MODAL_SELECTORS.panel);
    if (panel) panel.setAttribute('aria-hidden', String(!this._parsed.open));

    if (this._parsed.open && wrapper) {
      if (!this._focusTrap) this._focusTrap = createFocusTrap(wrapper);
      this._focusTrap.activate();
    } else {
      this._focusTrap?.deactivate();
    }
  }

  protected _render(): void {
    if (!this.shadowRoot) return;
    ensureModalStructure(this.shadowRoot, this._parsed);
    this._applyModalVisibility();
    const vm = buildAuthModalViewModel(this.currentState, this._parsed, {
      registerSessionReady: this._parsed.tab === 'register' ? this.canStartAuth() : undefined,
      primaryButtonLabel: MODAL_PASSKEY_BUTTON_LABEL,
      primaryButtonAriaLabel: MODAL_PASSKEY_ARIA_LABEL,
    });
    const surface: IRenderSurface = { shadowRoot: this.shadowRoot };
    renderAuthModal(surface, vm);
  }
}
