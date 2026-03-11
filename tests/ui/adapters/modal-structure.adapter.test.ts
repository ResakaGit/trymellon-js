import { describe, it, expect } from 'vitest';
import {
  ensureModalStructure,
  SLOT_CROSS_DEVICE,
} from '../../../src/ui/adapters/render/modal-structure.adapter';
import { DEFAULT_PARSED_MODAL_ATTRIBUTES } from '../../../src/ui/domain/contracts/constants';

function createShadowRoot(): ShadowRoot {
  const host = document.createElement('div');
  return host.attachShadow({ mode: 'open' });
}

describe('ui/adapters/modal-structure.adapter', () => {
  it('sets data-mellon-modal-variant on wrapper from parsed.modalVariant', () => {
    const shadowRoot = createShadowRoot();
    ensureModalStructure(shadowRoot, {
      ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
      modalVariant: 'minimal',
    });
    const wrapper = shadowRoot.querySelector('.mellon-modal-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-mellon-modal-variant')).toBe('minimal');
  });

  it('sets data-mellon-modal-variant to default when modalVariant is default', () => {
    const shadowRoot = createShadowRoot();
    ensureModalStructure(shadowRoot, {
      ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
      modalVariant: 'default',
    });
    const wrapper = shadowRoot.querySelector('.mellon-modal-wrapper');
    expect(wrapper?.getAttribute('data-mellon-modal-variant')).toBe('default');
  });

  it('creates wrapper, panel, tabs, content wrapper, cross-device slot and root structure', () => {
    const shadowRoot = createShadowRoot();
    ensureModalStructure(shadowRoot, DEFAULT_PARSED_MODAL_ATTRIBUTES);
    expect(shadowRoot.querySelector('.mellon-modal-wrapper')).not.toBeNull();
    expect(shadowRoot.querySelector('.mellon-modal-panel')).not.toBeNull();
    expect(shadowRoot.querySelector('.mellon-modal-tabs')).not.toBeNull();
    expect(shadowRoot.querySelector('.mellon-modal-content')).not.toBeNull();
    const crossDeviceSlot = shadowRoot.querySelector<HTMLSlotElement>(
      `slot[name="${SLOT_CROSS_DEVICE}"]`
    );
    expect(crossDeviceSlot).not.toBeNull();
    expect(shadowRoot.getElementById('mellon-root')).not.toBeNull();
  });

  it('uses DIALOG_TITLE_WITH_APP when appName is set', () => {
    const shadowRoot = createShadowRoot();
    ensureModalStructure(shadowRoot, {
      ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
      appName: 'My App',
    });
    const title = shadowRoot.querySelector('.mellon-dialog-title');
    expect(title?.textContent?.trim()).toBe('My App — Sign in or register');
  });

  it('orders modal children as title, description, tabs, QR area, separator and root', () => {
    const shadowRoot = createShadowRoot();
    ensureModalStructure(shadowRoot, DEFAULT_PARSED_MODAL_ATTRIBUTES);

    const panel = shadowRoot.querySelector<HTMLElement>('.mellon-modal-panel');
    expect(panel).not.toBeNull();
    if (!panel) return;

    const elementChildren = Array.from(panel.children) as HTMLElement[];
    expect(elementChildren[0].classList.contains('mellon-dialog-title')).toBe(true);
    expect(elementChildren[1].classList.contains('mellon-dialog-desc')).toBe(true);
    expect(elementChildren[2].classList.contains('mellon-modal-tabs')).toBe(true);

    const content = panel.querySelector<HTMLElement>('.mellon-modal-content');
    expect(content).not.toBeNull();
    if (!content) return;

    const contentChildren = Array.from(content.children) as HTMLElement[];
    expect(contentChildren[0].classList.contains('mellon-cross-device-wrap')).toBe(true);
    expect(contentChildren[1].classList.contains('mellon-modal-separator')).toBe(true);
    const defaultSlot =
      contentChildren[2].tagName.toLowerCase() === 'slot' ? contentChildren[2] : null;
    expect(defaultSlot).not.toBeNull();

    const qrWrap = contentChildren[0];
    expect(qrWrap.querySelector('.mellon-cross-device-skeleton')).not.toBeNull();
    expect(qrWrap.querySelector('.mellon-cross-device-error')).not.toBeNull();
    expect(qrWrap.querySelector('.mellon-cross-device-slot-wrap')).not.toBeNull();
  });
});
