/**
 * UI domain validators barrel. Re-exports type guards and HOFs.
 */
export {
  isUIState,
  ensureUIState,
  isUIMode,
  isThemeKind,
  isTabKind,
  isModalDisplayMode,
  isClientStatus,
  isEnvResolvedPayload,
  isFSMEvent,
} from './validators-state';
export {
  isParsedAttributes,
  isTabLabels,
  isParsedModalAttributes,
  defaultParsedAttributes,
  defaultParsedModalAttributes,
  ensureParsedAttributes,
  ensureParsedModalAttributes,
} from './validators-attributes';
