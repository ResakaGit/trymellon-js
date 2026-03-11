/** UI domain barrel: FSM, types, defaults, enum arrays, validators. No DOM/core dependencies. */
export { getNextState } from './fsm';
export { INITIAL_UI_STATE } from './types';
export type { UIState, FSMEvent, EnvResolvedPayload, UIMode, TabKind } from './types';
export type {
  ThemeKind,
  ButtonAction,
  ButtonVariant,
  ModalVariant,
  ParsedAttributes,
  ModalDisplayMode,
  ModalTabKind,
  TabLabels,
  FallbackTypeKind,
  ParsedModalAttributes,
} from './contracts/types';
export type { AuthButtonViewModel, AuthModalViewModel } from './auth-viewmodels';
export { buildAuthButtonViewModel, buildAuthModalViewModel } from './auth-viewmodels';
export {
  DEFAULT_UI_MODE,
  DEFAULT_THEME,
  DEFAULT_BUTTON_ACTION,
  DEFAULT_BUTTON_VARIANT,
  DEFAULT_MODAL_VARIANT,
  DEFAULT_MODAL_DISPLAY_MODE,
  DEFAULT_TAB,
  DEFAULT_TAB_LABELS,
  DEFAULT_PARSED_ATTRIBUTES,
  DEFAULT_PARSED_MODAL_ATTRIBUTES,
} from './contracts/constants';
export {
  UI_MODES,
  THEME_KINDS,
  TAB_KINDS,
  MODAL_DISPLAY_MODES,
  FALLBACK_TYPES,
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  MODAL_VARIANTS,
  isUIState,
  ensureUIState,
  isUIMode,
  isThemeKind,
  isTabKind,
  isModalDisplayMode,
  isButtonAction,
  isButtonVariant,
  isModalVariant,
  isEnvResolvedPayload,
  isFSMEvent,
} from './validators/validators-state';
export {
  isParsedAttributes,
  isParsedModalAttributes,
  isTabLabels,
  defaultParsedAttributes,
  defaultParsedModalAttributes,
  ensureParsedAttributes,
  ensureParsedModalAttributes,
} from './validators';
