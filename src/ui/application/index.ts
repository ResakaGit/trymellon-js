/**
 * Application layer: use cases orchestrating FSM and ports. Imports from ../domain and ../ports only.
 */
export { applyTransition } from './transition.use-case';
export { runEnvEval, type RunEnvEvalParams } from './evaluate-env.use-case';
export {
  authUiApplicationService,
  type AuthUiApplicationService,
} from './auth-ui.application-service';
