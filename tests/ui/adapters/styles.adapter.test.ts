import { describe, it, expect } from 'vitest';
import {
  BASE_STYLES,
  MODAL_EXTRA_STYLES,
  getStylesFallback,
  getModalStylesFallback,
  createConstructableStylesheet,
  createModalConstructableStylesheet,
} from '../../../src/ui/adapters/render/styles.adapter';

describe('ui/adapters/styles.adapter', () => {
  it('getStylesFallback returns BASE_STYLES string', () => {
    const css = getStylesFallback();
    expect(css).toBe(BASE_STYLES);
    expect(css).toContain('.mellon-root');
  });

  it('getModalStylesFallback returns BASE + MODAL_EXTRA styles', () => {
    const css = getModalStylesFallback();
    expect(css).toContain('.mellon-modal-wrapper');
    expect(css).toContain('.mellon-root');
    expect(css).toContain(MODAL_EXTRA_STYLES.split('\n')[0]?.trim() ?? '.mellon-modal-wrapper');
  });

  it('createConstructableStylesheet returns null or CSSStyleSheet without throwing', () => {
    const sheet = createConstructableStylesheet();
    // In happy-dom this may be null; we only assert that it does not throw and, when present, is a CSSStyleSheet.
    if (sheet) {
      expect(sheet).toBeInstanceOf(CSSStyleSheet);
    } else {
      expect(sheet).toBeNull();
    }
  });

  it('createModalConstructableStylesheet returns null or CSSStyleSheet without throwing', () => {
    const sheet = createModalConstructableStylesheet();
    if (sheet) {
      expect(sheet).toBeInstanceOf(CSSStyleSheet);
    } else {
      expect(sheet).toBeNull();
    }
  });

  it('BASE_STYLES includes design tokens: text-muted, focus-ring, primary-contrast', () => {
    expect(BASE_STYLES).toContain('--mellon-text-muted');
    expect(BASE_STYLES).toContain('--mellon-focus-ring');
    expect(BASE_STYLES).toContain('--mellon-primary-contrast');
  });

  it('BASE_STYLES uses text-muted for loading/message and focus-visible for button', () => {
    expect(BASE_STYLES).toContain('--mellon-text-muted');
    expect(BASE_STYLES).toContain('.mellon-btn:focus-visible');
  });

  it('MODAL_EXTRA_STYLES uses tokenized overlay and focus-visible for tabs', () => {
    expect(MODAL_EXTRA_STYLES).toContain('--mellon-overlay');
    expect(MODAL_EXTRA_STYLES).toContain('button:focus-visible');
  });
});
