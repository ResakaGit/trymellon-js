/**
 * Modal DOM structure: overlay (when mode=modal), panel, tabs, content wrapper (slot cross-device + default slot with #mellon-root), fallback-cta slot.
 * createElement/setAttribute/appendChild only. FSM content from shadow.adapter render(). ARIA: dialog on panel, tablist on tabs.
 * Constants: render/constants.ts.
 */
import type { ParsedModalAttributes } from '../../domain/contracts/types';
import {
  MELLON_ROOT_ID,
  WRAPPER_CLASS,
  OVERLAY_CLASS,
  PANEL_CLASS,
  TABS_CLASS,
  CONTENT_WRAPPER_CLASS,
  SLOT_CROSS_DEVICE,
  SLOT_FALLBACK_CTA,
  MELLON_DIALOG_TITLE_ID,
  MELLON_DIALOG_DESC_ID,
  DIALOG_TITLE_TEXT,
  DIALOG_TITLE_WITH_APP,
  DIALOG_DESC_TEXT,
  MODAL_SEPARATOR_TEXT,
  CROSS_DEVICE_WRAP_CLASS,
  MODAL_SEPARATOR_CLASS,
  CROSS_DEVICE_CTA_TEXT,
  CROSS_DEVICE_CTA_CLASS,
  CROSS_DEVICE_QR_BUTTON_ARIA_LABEL,
  MELLON_ACTION_FALLBACK_QR,
  MELLON_QR_SKELETON_CLASS,
  MELLON_QR_ERROR_CLASS,
  MELLON_QR_SLOT_WRAP_CLASS,
  QR_SKELETON_TEXT,
  QR_TIMEOUT_ERROR_TEXT,
  SVG_NS,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_CLOSE_BUTTON_ARIA_LABEL,
} from './constants';

export { SLOT_CROSS_DEVICE, MELLON_DIALOG_TITLE_ID, MELLON_DIALOG_DESC_ID };

function ensureWrapper(shadowRoot: ShadowRoot): HTMLElement {
  let wrapper = shadowRoot.querySelector<HTMLElement>(`.${WRAPPER_CLASS}`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = WRAPPER_CLASS;
    shadowRoot.appendChild(wrapper);
  }
  return wrapper;
}

function ensureOverlay(wrapper: HTMLElement): HTMLElement {
  let overlay = wrapper.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(overlay);
  }
  return overlay;
}

function ensurePanel(wrapper: HTMLElement): HTMLElement {
  let panel = wrapper.querySelector<HTMLElement>(`.${PANEL_CLASS}`);
  if (!panel) {
    panel = document.createElement('div');
    panel.className = PANEL_CLASS;
    wrapper.appendChild(panel);
  }
  return panel;
}

/** Panel as dialog: role, aria-modal, labelledby/describedby. */
function setPanelDialogAria(panel: HTMLElement, mode: 'modal' | 'inline'): void {
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', mode === 'modal' ? 'true' : 'false');
  panel.setAttribute('aria-labelledby', MELLON_DIALOG_TITLE_ID);
  panel.setAttribute('aria-describedby', MELLON_DIALOG_DESC_ID);
}

/** Creates or reuses dialog title and description; inserts at panel start. Uses dialog-title/dialog-description when set, else app-name + defaults. */
function ensureDialogTitleAndDescription(panel: HTMLElement, parsed: ParsedModalAttributes): void {
  let titleEl = panel.querySelector<HTMLElement>(`#${MELLON_DIALOG_TITLE_ID}`);
  if (!titleEl) {
    titleEl = document.createElement('h2');
    titleEl.id = MELLON_DIALOG_TITLE_ID;
    titleEl.className = 'mellon-dialog-title';
    panel.insertBefore(titleEl, panel.firstChild);
  }
  const titleText =
    parsed.dialogTitle?.trim() ??
    (parsed.appName?.trim() ? DIALOG_TITLE_WITH_APP(parsed.appName.trim()) : DIALOG_TITLE_TEXT);
  titleEl.textContent = titleText;

  let descEl = panel.querySelector<HTMLElement>(`#${MELLON_DIALOG_DESC_ID}`);
  if (!descEl) {
    descEl = document.createElement('p');
    descEl.id = MELLON_DIALOG_DESC_ID;
    descEl.className = 'mellon-dialog-desc';
    panel.insertBefore(descEl, titleEl.nextSibling);
  }
  descEl.textContent = parsed.dialogDescription?.trim() ?? DIALOG_DESC_TEXT;
}

/** Close button (visual 'X') in top-right corner of the modal panel. */
function ensureCloseButton(panel: HTMLElement): void {
  let btn = panel.querySelector<HTMLButtonElement>(`.${MODAL_CLOSE_BUTTON_CLASS}`);
  if (btn) return;
  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = MODAL_CLOSE_BUTTON_CLASS;
  btn.setAttribute('aria-label', MODAL_CLOSE_BUTTON_ARIA_LABEL);
  btn.setAttribute('data-mellon-modal-close', 'true');
  btn.textContent = '×';
  panel.appendChild(btn);
}

function ensureTabs(
  panel: HTMLElement,
  tabLabels: { register: string; login: string }
): HTMLElement {
  let tabs = panel.querySelector<HTMLElement>(`.${TABS_CLASS}`);
  if (!tabs) {
    tabs = document.createElement('div');
    tabs.className = TABS_CLASS;
    tabs.setAttribute('role', 'tablist');
    const btnRegister = document.createElement('button');
    btnRegister.type = 'button';
    btnRegister.setAttribute('data-tab', 'register');
    btnRegister.setAttribute('role', 'tab');
    const btnLogin = document.createElement('button');
    btnLogin.type = 'button';
    btnLogin.setAttribute('data-tab', 'login');
    btnLogin.setAttribute('role', 'tab');
    tabs.appendChild(btnRegister);
    tabs.appendChild(btnLogin);
    const afterDesc = panel.querySelector<HTMLElement>(`#${MELLON_DIALOG_DESC_ID}`);
    panel.insertBefore(tabs, afterDesc ? afterDesc.nextSibling : panel.firstChild);
  }
  const [btnRegister, btnLogin] = tabs.querySelectorAll('button');
  if (btnRegister) btnRegister.textContent = tabLabels.register;
  if (btnLogin) btnLogin.textContent = tabLabels.login;
  return tabs;
}

/** Content wrapper: cross-device slot (QR) + default slot (mellon-root). Same structure as landing: QR above, Try Passkey below. */
function ensureModalContentWrapper(panel: HTMLElement): HTMLElement {
  let wrapper = panel.querySelector<HTMLElement>(`.${CONTENT_WRAPPER_CLASS}`);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = CONTENT_WRAPPER_CLASS;
    const afterTabs = panel.querySelector(`.${TABS_CLASS}`);
    panel.insertBefore(wrapper, afterTabs ? afterTabs.nextSibling : panel.firstChild);
  }
  return wrapper;
}

/** QR code icon as inline SVG (icon-only button). */
function createQrIconSVG(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'mellon-qr-icon');
  svg.setAttribute('fill', 'currentColor');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm8-2h6v6h-6v-6zm2 2v2h2v-2h-2zm4-12h2v2h-2V5zm0 8h2v2h-2v-2zm-4 4h2v2h-2v-2zm0-8h2v2h-2V9zm0 4h2v2h-2v-2z'
  );
  svg.appendChild(path);
  return svg;
}

/** Default content for cross-device slot: CTA text + icon-only QR button. Shown when host does not inject QR; click dispatches fallback qr. */
function createCrossDeviceDefaultContent(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement('div');
  wrap.className = CROSS_DEVICE_CTA_CLASS;
  const p = document.createElement('p');
  p.className = 'mellon-cross-device-cta-text';
  p.textContent = CROSS_DEVICE_CTA_TEXT;
  wrap.appendChild(p);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mellon-btn mellon-btn-qr-icon';
  btn.setAttribute('data-mellon-action', MELLON_ACTION_FALLBACK_QR);
  btn.setAttribute('aria-label', CROSS_DEVICE_QR_BUTTON_ARIA_LABEL);
  btn.appendChild(createQrIconSVG());
  wrap.appendChild(btn);
  frag.appendChild(wrap);
  return frag;
}

/** Skeleton node (modal-owned): shown when waiting for host-injected QR. */
function createQrSkeletonNode(): HTMLElement {
  const el = document.createElement('div');
  el.className = MELLON_QR_SKELETON_CLASS;
  el.setAttribute('aria-live', 'polite');
  const label = document.createElement('span');
  label.textContent = QR_SKELETON_TEXT;
  const dots = document.createElement('span');
  dots.className = 'mellon-qr-dots';
  dots.setAttribute('aria-hidden', 'true');
  el.appendChild(label);
  el.appendChild(dots);
  return el;
}

/** Error node (modal-owned): shown when QR load times out. */
function createQrErrorNode(): HTMLElement {
  const el = document.createElement('div');
  el.className = MELLON_QR_ERROR_CLASS;
  el.setAttribute('aria-live', 'polite');
  el.textContent = QR_TIMEOUT_ERROR_TEXT;
  return el;
}

/** Wrapper + slot for cross-device UI. Includes skeleton (waiting) and error (timeout); slot shows default CTA or host-injected QR. */
function ensureCrossDeviceSlot(panel: HTMLElement): HTMLSlotElement {
  const wrapper = ensureModalContentWrapper(panel);
  let wrap = wrapper.querySelector<HTMLElement>(`.${CROSS_DEVICE_WRAP_CLASS}`);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = CROSS_DEVICE_WRAP_CLASS;
    wrap.setAttribute('data-qr-area-state', 'default');

    wrap.appendChild(createQrSkeletonNode());
    wrap.appendChild(createQrErrorNode());

    const slotWrap = document.createElement('div');
    slotWrap.className = MELLON_QR_SLOT_WRAP_CLASS;
    const slot = document.createElement('slot');
    slot.name = SLOT_CROSS_DEVICE;
    slot.appendChild(createCrossDeviceDefaultContent());
    slotWrap.appendChild(slot);
    wrap.appendChild(slotWrap);

    wrapper.appendChild(wrap);
  }
  const slot = wrap.querySelector<HTMLSlotElement>(`slot[name="${SLOT_CROSS_DEVICE}"]`);
  if (!slot) {
    const created = document.createElement('slot');
    created.name = SLOT_CROSS_DEVICE;
    created.appendChild(createCrossDeviceDefaultContent());
    wrap.appendChild(created);
    return created;
  }
  return slot;
}

/** Separator: continuous lines with "or" centered between them. */
function ensureSeparator(panel: HTMLElement): void {
  const wrapper = ensureModalContentWrapper(panel);
  if (wrapper.querySelector(`.${MODAL_SEPARATOR_CLASS}`)) return;
  const sep = document.createElement('div');
  sep.className = MODAL_SEPARATOR_CLASS;
  sep.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  span.className = 'mellon-separator-text';
  span.textContent = MODAL_SEPARATOR_TEXT;
  sep.appendChild(span);
  const wrap = wrapper.querySelector(`.${CROSS_DEVICE_WRAP_CLASS}`);
  wrapper.insertBefore(sep, wrap ? wrap.nextSibling : wrapper.firstChild);
}

/** Default slot: main content; fallback #mellon-root when host does not inject. Lives inside content wrapper. */
function ensureDefaultSlotWithRoot(panel: HTMLElement): HTMLElement {
  const wrapper = ensureModalContentWrapper(panel);
  let slot = wrapper.querySelector<HTMLSlotElement>('slot:not([name])');
  if (!slot) {
    slot = document.createElement('slot');
    const root = document.createElement('div');
    root.id = MELLON_ROOT_ID;
    root.className = 'mellon-root';
    slot.appendChild(root);
    wrapper.appendChild(slot);
  }
  let root = panel.querySelector<HTMLElement>(`#${MELLON_ROOT_ID}`);
  if (!root) {
    root = document.createElement('div');
    root.id = MELLON_ROOT_ID;
    root.className = 'mellon-root';
    slot.appendChild(root);
  }
  return root;
}

function ensureFallbackSlot(panel: HTMLElement): HTMLSlotElement {
  let slot = panel.querySelector<HTMLSlotElement>(`slot[name="${SLOT_FALLBACK_CTA}"]`);
  if (!slot) {
    slot = document.createElement('slot');
    slot.name = SLOT_FALLBACK_CTA;
    panel.appendChild(slot);
  }
  return slot;
}

/** Syncs active tab on buttons (aria-selected). Does not control wrapper/overlay visibility (WC responsibility via open/mode). */
function syncTabAriaSelected(panel: HTMLElement, activeTab: 'register' | 'login'): void {
  const tabs = panel.querySelector<HTMLElement>(`.${TABS_CLASS}`);
  if (!tabs) return;
  const reg = tabs.querySelector<HTMLButtonElement>('[data-tab="register"]');
  const log = tabs.querySelector<HTMLButtonElement>('[data-tab="login"]');
  if (reg) reg.setAttribute('aria-selected', String(activeTab === 'register'));
  if (log) log.setAttribute('aria-selected', String(activeTab === 'login'));
}

/** Ensures modal structure: wrapper, overlay when mode=modal, panel, tabs, #mellon-root, fallback-cta slot, tab aria-selected. Visibility (open/mode) is WC responsibility. */
function ensureModalStructure(shadowRoot: ShadowRoot, parsed: ParsedModalAttributes): void {
  if (shadowRoot == null || parsed == null) return;
  const wrapper = ensureWrapper(shadowRoot);
  wrapper.setAttribute('data-mellon-modal-variant', parsed.modalVariant);
  if (parsed.mode === 'modal') {
    ensureOverlay(wrapper);
  }
  const panel = ensurePanel(wrapper);
  setPanelDialogAria(panel, parsed.mode);
  ensureDialogTitleAndDescription(panel, parsed);
  ensureCloseButton(panel);
  ensureTabs(panel, parsed.tabLabels);
  ensureCrossDeviceSlot(panel);
  ensureSeparator(panel);
  ensureDefaultSlotWithRoot(panel);
  ensureFallbackSlot(panel);
  syncTabAriaSelected(panel, parsed.tab);
}

export { ensureModalStructure };
