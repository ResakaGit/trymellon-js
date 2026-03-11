import type { UIState, TabKind } from '../domain/types';
import { INITIAL_UI_STATE, tabToUIMode } from '../domain/types';
import { authUiApplicationService, canStartAuth } from '../application/auth-ui.application-service';
import type {
  CoreAuthPort,
  CoreAuthOptions,
  MellonOperationDetail,
} from '../ports/core-events.port';
import type { RunEnvEvalParams } from '../application/evaluate-env.use-case';

export type PendingAuthOperation = 'register' | 'authenticate';

export class AuthController {
  private _currentState: UIState = INITIAL_UI_STATE;
  private _lastRenderedState: UIState | null = null;
  private _renderDirty = true;
  private _pendingOperation: PendingAuthOperation = 'authenticate';
  private _currentNonce: string | undefined = undefined;
  private _envEvalRequestId = 0;

  get currentState(): UIState {
    return this._currentState;
  }

  setState(next: UIState): void {
    this._currentState = next;
    this._renderDirty = true;
  }

  invalidateRender(): void {
    this._renderDirty = true;
  }

  /**
   * Decides if a render is needed based on state/dirty flag.
   * Returns true when the caller should render and marks state as clean.
   */
  consumeRenderDecision(): boolean {
    if (!this._renderDirty && this._currentState === this._lastRenderedState) {
      return false;
    }
    this._lastRenderedState = this._currentState;
    this._renderDirty = false;
    return true;
  }

  setPendingOperationFromTab(tab: TabKind): void {
    this._pendingOperation = tab === 'login' ? 'authenticate' : 'register';
  }

  get pendingOperation(): PendingAuthOperation {
    return this._pendingOperation;
  }

  setNonce(nonce: string | undefined): void {
    this._currentNonce = nonce;
  }

  consumeCancelledDetailIfAuthenticating(): MellonOperationDetail | null {
    if (this._currentState !== 'AUTHENTICATING') return null;
    const detail: MellonOperationDetail = {
      operation: this._pendingOperation === 'authenticate' ? 'login' : this._pendingOperation,
      ...(this._currentNonce !== undefined && { nonce: this._currentNonce }),
    };
    this._currentNonce = undefined;
    return detail;
  }

  handleAuthSuccess(): void {
    const next = authUiApplicationService.tryHandleAuthSuccess(this._currentState);
    if (next === null) return;
    this.setState(next);
  }

  handleAuthError(): void {
    const next = authUiApplicationService.tryHandleAuthError(this._currentState);
    if (next === null) return;
    this.setState(next);
  }

  onStartEvent(detail: MellonOperationDetail | undefined): void {
    if (detail?.nonce !== undefined) {
      this._currentNonce = detail.nonce;
    }
  }

  startAuthFromClick(core: CoreAuthPort | null, tab: TabKind, options?: CoreAuthOptions): void {
    if (!core) return;
    if (!canStartAuth(this._currentState)) return;
    this.setPendingOperationFromTab(tab);
    const next = authUiApplicationService.startAuth(
      this._currentState,
      tabToUIMode(tab),
      core,
      options
    );
    this.setState(next);
  }

  async runEnvEval(params: Omit<RunEnvEvalParams, 'currentState'>): Promise<UIState | null> {
    const requestId = ++this._envEvalRequestId;
    this.setState(authUiApplicationService.envEvalStart(this._currentState));
    const nextState = await authUiApplicationService.evaluateEnv({
      ...params,
      currentState: this._currentState,
    });
    if (requestId !== this._envEvalRequestId) {
      return null;
    }
    return nextState;
  }

  reset(): void {
    this._currentState = authUiApplicationService.reset(this._currentState);
    this._lastRenderedState = null;
    this._renderDirty = true;
    this._currentNonce = undefined;
  }

  setStateForRender(state: UIState): void {
    this._currentState = state;
    this._renderDirty = true;
  }
}
