/**
 * Validators for parsed attributes (root and modal). Pure type guards and HOFs.
 */
import type { ParsedAttributes, TabLabels, ParsedModalAttributes } from '../contracts/types';
import { DEFAULT_PARSED_ATTRIBUTES, DEFAULT_PARSED_MODAL_ATTRIBUTES } from '../contracts/constants';
import {
  isUIMode,
  isThemeKind,
  isTabKind,
  isModalDisplayMode,
  isButtonAction,
  isButtonVariant,
  isModalVariant,
} from './validators-state';

export function isParsedAttributes(value: unknown): value is ParsedAttributes {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.appId === 'string' &&
    typeof o.publishableKey === 'string' &&
    isUIMode(o.mode) &&
    (o.externalUserId === null || typeof o.externalUserId === 'string') &&
    isThemeKind(o.theme) &&
    isButtonAction(o.action) &&
    typeof o.triggerOnly === 'boolean' &&
    isButtonVariant(o.buttonVariant) &&
    (o.ticketId === undefined || o.ticketId === null || typeof o.ticketId === 'string')
  );
}

export function isTabLabels(value: unknown): value is TabLabels {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.register === 'string' && typeof o.login === 'string';
}

export function isParsedModalAttributes(value: unknown): value is ParsedModalAttributes {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.open === 'boolean' &&
    isModalDisplayMode(o.mode) &&
    isTabKind(o.tab) &&
    isTabLabels(o.tabLabels) &&
    isThemeKind(o.theme) &&
    (o.sessionId === null || typeof o.sessionId === 'string') &&
    (o.onboardingUrl === null || typeof o.onboardingUrl === 'string') &&
    (o.isMobileOverride === null || typeof o.isMobileOverride === 'boolean') &&
    (o.fallbackType === undefined || o.fallbackType === 'email' || o.fallbackType === 'qr') &&
    typeof o.appId === 'string' &&
    typeof o.publishableKey === 'string' &&
    (o.appName == null || typeof o.appName === 'string') &&
    (o.dialogTitle == null || typeof o.dialogTitle === 'string') &&
    (o.dialogDescription == null || typeof o.dialogDescription === 'string') &&
    (o.externalUserId == null || typeof o.externalUserId === 'string') &&
    isModalVariant(o.modalVariant)
  );
}

export function defaultParsedAttributes(): ParsedAttributes {
  return DEFAULT_PARSED_ATTRIBUTES;
}

export function defaultParsedModalAttributes(): ParsedModalAttributes {
  return DEFAULT_PARSED_MODAL_ATTRIBUTES;
}

export function ensureParsedAttributes(value: unknown): ParsedAttributes {
  return isParsedAttributes(value) ? value : defaultParsedAttributes();
}

export function ensureParsedModalAttributes(value: unknown): ParsedModalAttributes {
  return isParsedModalAttributes(value) ? value : defaultParsedModalAttributes();
}
