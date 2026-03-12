/**
 * Parses and validates observedAttributes for inline WC. Uses parseEnum + domain enum arrays and defaults.
 */
import type { ParsedAttributes } from '../../domain/contracts/types';
import {
  UI_MODES,
  THEME_KINDS,
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  DEFAULT_UI_MODE,
  DEFAULT_THEME,
  DEFAULT_BUTTON_ACTION,
  DEFAULT_BUTTON_VARIANT,
} from '../../domain';
import { ensureParsedAttributes } from '../../domain/validators';
import { parseString, parseOptionalString, parseEnum, parseBoolean } from './parse.utils';

export type { ThemeKind, ParsedAttributes } from '../../domain/contracts/types';

export function parseAttributesFromElement(element: HTMLElement): ParsedAttributes {
  const raw = {
    appId: parseString(element.getAttribute('app-id')),
    publishableKey: parseString(element.getAttribute('publishable-key')),
    mode: parseEnum(element.getAttribute('mode'), UI_MODES, DEFAULT_UI_MODE),
    externalUserId: parseOptionalString(element.getAttribute('external-user-id')),
    theme: parseEnum(element.getAttribute('theme'), THEME_KINDS, DEFAULT_THEME),
    action: parseEnum(element.getAttribute('action'), BUTTON_ACTIONS, DEFAULT_BUTTON_ACTION),
    triggerOnly: parseBoolean(element.getAttribute('trigger-only')),
    buttonVariant: parseEnum(
      element.getAttribute('button-variant'),
      BUTTON_VARIANTS,
      DEFAULT_BUTTON_VARIANT
    ),
    buttonLabel: parseOptionalString(element.getAttribute('button-label')),
    buttonAriaLabel: parseOptionalString(element.getAttribute('button-aria-label')),
  };
  return ensureParsedAttributes(raw);
}
