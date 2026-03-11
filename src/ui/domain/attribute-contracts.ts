/** Re-export attribute contracts (types + constants) for backward compatibility. */
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
