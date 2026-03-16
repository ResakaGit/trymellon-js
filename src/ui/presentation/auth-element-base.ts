/**
 * Abstract base for <trymellon-auth> and <trymellon-auth-modal>. Shared lifecycle: teardown, host/fallback listeners, Mellon handlers, env eval.
 * AuthController encapsulates FSM/env-eval; this base wires it to HTMLElement and DOM events.
 */
import type { UIState, TabKind } from '../domain/types';
import { createEnvStatusPortFromCore } from '../adapters/infra/env-status.adapter';
import { eventBridgeAdapter } from '../adapters/infra/event-bridge.adapter';
import type {
  CoreAuthPort,
  MellonFallbackDetail,
  MellonOperationDetail,
} from '../ports/core-events.port';
import { createCoreForUI, isCoreAuthPort } from '../adapters/infra/core-factory.adapter';
import type { CoreConfig } from '../adapters/infra/core-factory.adapter';
import type { RunEnvEvalParams } from '../application/evaluate-env.use-case';
import { createMellonCancelledEvent, createMellonFallbackEvent } from './ui-events';
import { AuthController } from './auth-controller';

/**
 * Abstract base: FSM, core, event bridge, env eval, fallback/shadow click.
 * Subclasses define observedAttributes, parsing, _render() and (modal only) open/tab.
 * Render flow: setState / invalidateRender → scheduleRenderIfNeeded → _render (single path).
 */
export abstract class AuthElementBase extends HTMLElement {
  protected _controller = new AuthController();
  protected _unsubscribeBridge: (() => void) | null = null;
  protected _core: CoreAuthPort | null = null;
  protected _lastCoreConfig: CoreConfig | null = null;

  /** Encapsulates state assignment and schedules render. Single canonical way to change _currentState and trigger _render. */
  protected setState(next: UIState): void {
    this._controller.setState(next);
    this.scheduleRenderIfNeeded();
  }

  /** Marks that a re-render is needed even if FSM state did not change (e.g. theme or props). */
  protected invalidateRender(): void {
    this._controller.invalidateRender();
    this.scheduleRenderIfNeeded();
  }

  /** Compares current state with last render; if changed or dirty, calls _render and updates cache. */
  protected scheduleRenderIfNeeded(): void {
    if (!this.shadowRoot) return;
    if (!this._controller.consumeRenderDecision()) return;
    this._render();
  }

  /** If state was AUTHENTICATING: build detail, dispatch mellon:cancelled, clear nonce; return true. Else false. */
  protected _emitCancelledIfAuthenticating(): boolean {
    const detail = this._controller.consumeCancelledDetailIfAuthenticating();
    if (!detail) return false;
    this.dispatchEvent(createMellonCancelledEvent(detail));
    return true;
  }

  /**
   * Injects auth core and starts env eval. Pass null to detach and transition to IDLE.
   * Multi-write safe: teardown existing core before attaching new one. Host must call reset() before re-open if WC stays in DOM.
   * @param core - CoreAuthPort-compatible instance, or null to detach.
   */
  attachCore(core: unknown): void {
    if (this._core !== null) {
      this._teardownCore();
    }
    if (core == null) {
      this._core = null;
      this._controller.reset();
      this.scheduleRenderIfNeeded();
      return;
    }
    if (!isCoreAuthPort(core)) {
      throw new Error('[trymellon-auth] attachCore requires a CoreAuthPort-compatible instance.');
    }
    this._core = core;
    this._unsubscribeBridge = eventBridgeAdapter.subscribe(this._core, this);
    this._attachHostListeners();
    this._runEnvEval();
  }

  protected _teardownCore(): void {
    this._unsubscribeBridge?.();
    this._unsubscribeBridge = null;
    this.removeEventListener('mellon:start', this._onMellonStart);
    this.removeEventListener('mellon:success', this._onMellonSuccess);
    this.removeEventListener('mellon:error', this._onMellonError);
    this._core = null;
  }

  protected _attachHostListeners(): void {
    this.removeEventListener('mellon:start', this._onMellonStart);
    this.removeEventListener('mellon:success', this._onMellonSuccess);
    this.removeEventListener('mellon:error', this._onMellonError);
    this.addEventListener('mellon:start', this._onMellonStart);
    this.addEventListener('mellon:success', this._onMellonSuccess);
    this.addEventListener('mellon:error', this._onMellonError);
  }

  protected _onMellonSuccess = (): void => {
    if (this._controller.currentState === 'ENROLLING') {
      this._controller.handleEnrollSuccess();
    } else {
      this._controller.handleAuthSuccess();
    }
    this.scheduleRenderIfNeeded();
  };

  protected _onMellonError = (): void => {
    if (this._controller.currentState === 'ENROLLING') {
      this._controller.handleEnrollError();
    } else {
      this._controller.handleAuthError();
    }
    this.scheduleRenderIfNeeded();
  };

  protected _onMellonStart = (e: Event): void => {
    const detail = (e as CustomEvent<MellonOperationDetail>).detail;
    this._controller.onStartEvent(detail);
  };

  /**
   * Semantic logic for "click on primary auth button". Subclasses register DOM delegation
   * (e.g. adapters/interactions/dom.adapter) and call this method from the callback.
   */
  protected startAuthFromClick(): void {
    if (!this._core) return;
    if (!this.canStartAuth()) return;
    this._controller.startAuthFromClick(this._core, this.getTabKind(), this.getCoreAuthOptions());
    this.scheduleRenderIfNeeded();
  }

  /**
   * Emits mellon:fallback. With type = email|qr sets detail.fallbackType; without type (generic "Continue") does not set fallbackType.
   */
  protected dispatchFallback(type?: 'email' | 'qr'): void {
    const detail: MellonFallbackDetail =
      type !== undefined
        ? { ...this.getFallbackDetail(), fallbackType: type }
        : this.getFallbackDetail();
    this.dispatchEvent(createMellonFallbackEvent(detail));
  }

  protected async _runEnvEval(): Promise<void> {
    if (!this._core) return;
    const params: RunEnvEvalParams = {
      ...this.getEnvEvalParams(),
      envStatusPort: createEnvStatusPortFromCore(this._core),
      // currentState is injected by AuthController
    } as RunEnvEvalParams;
    const nextState = await this._controller.runEnvEval(params);
    if (nextState === null) return;
    if (!this._core || !this.isConnected) return;
    this.setState(nextState);
  }

  protected _maybeAutoCreateCoreAndRunEnvEval(): void {
    if (this._core !== null) return;
    const config = this.getCoreConfig();
    if (!config) return;
    const core = createCoreForUI(config);
    if (!core) {
      this.attachCore(null);
      return;
    }
    this.attachCore(core);
  }

  /** Single path: compare config with last, attach or detach core. No per-call special cases. */
  protected _reconcileCoreFromConfig(): void {
    const nextConfig = this.getCoreConfig();
    const sameConfig =
      (this._lastCoreConfig === null && nextConfig === null) ||
      (this._lastCoreConfig !== null &&
        nextConfig !== null &&
        this._lastCoreConfig.appId === nextConfig.appId &&
        this._lastCoreConfig.publishableKey === nextConfig.publishableKey);

    if (sameConfig) return;

    this._lastCoreConfig = nextConfig;

    if (nextConfig === null) {
      this.attachCore(null);
      return;
    }

    const core = createCoreForUI(nextConfig);
    this.attachCore(core ?? null);
  }

  disconnectedCallback(): void {
    this._teardownCore();
  }

  /** Current FSM state (read-only). */
  get currentState(): UIState {
    return this._controller.currentState;
  }

  /**
   * Transitions FSM to IDLE, clears in-flight ceremony, re-renders. If state was AUTHENTICATING, emits mellon:cancelled first.
   * Host must call reset() before re-open if WC remains in DOM after close.
   */
  reset(): void {
    this._emitCancelledIfAuthenticating();
    this._controller.reset();
    this.scheduleRenderIfNeeded();
  }

  /** Tests only: set state and re-render without FSM transition. */
  setStateForRender(state: UIState): void {
    this._controller.setStateForRender(state);
    this.scheduleRenderIfNeeded();
  }

  protected abstract getTabKind(): TabKind;
  protected abstract getCoreAuthOptions(): { externalUserId?: string | null };
  protected abstract canStartAuth(): boolean;
  protected abstract getEnvEvalParams(): Omit<RunEnvEvalParams, 'envStatusPort' | 'currentState'>;
  protected abstract getCoreConfig(): { appId: string; publishableKey: string } | null;
  protected abstract getFallbackDetail(): MellonFallbackDetail;
  protected abstract _render(): void;
}
