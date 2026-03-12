/**
 * WC styles. Injected via adoptedStyleSheets or <style> + textContent. No innerHTML.
 * Constructable Stylesheet when supported; <style> fallback (e.g. Safari <16.4).
 */

/**
 * Host overrides via CSS custom properties. Delegation: --mellon-* fallback to MDS-like tokens
 * (--surface-elevated, --text-strong, etc.) so the host can drive look without coupling.
 * Default: white-label minimal TryMellon — neutral with a cool tint (220°), WCAG AA.
 * Theming and accessibility are configurable via WC attributes and host CSS.
 */
export const BASE_STYLES = `
:host {
  display: block;
  max-width: 100%;
  border: none;
  outline: none;
  /* Inherit --font-sans from host (e.g. landing: Noto Sans JP) or --mellon-font-sans; fallback system stack. */
  font-family: var(--font-sans, var(--mellon-font-sans, system-ui, -apple-system, sans-serif));
  --mellon-surface: var(--mellon-surface, hsl(var(--surface-elevated, 220 14% 98%)));
  --mellon-text: var(--mellon-text, hsl(var(--text-strong, 220 12% 14%)));
  --mellon-text-muted: var(--mellon-text-muted, hsl(var(--text-muted, 220 10% 48%)));
  --mellon-border: var(--mellon-border, hsl(var(--border-strong, 220 10% 90%)));
  --mellon-primary: var(--mellon-primary, hsl(var(--primary, 217 91% 58%)));
  --mellon-primary-contrast: var(--mellon-primary-contrast, #fff);
  --mellon-radius: var(--mellon-radius, var(--radius, 8px));
  --mellon-focus-ring: var(--mellon-focus-ring, hsl(217 91% 50%));
  --mellon-overlay: var(--mellon-overlay, rgba(0,0,0,0.5));
  /* Panel padding: keeps content away from edges; host can override. */
  --mellon-modal-panel-padding: var(--mellon-modal-panel-padding, 2rem);
  /* Cross-device CTA: text colour (grey between strong and muted). */
  --mellon-cta-text-color: var(--mellon-cta-text-color, var(--mellon-text-muted));
  /* Separator: line and "or" text (standard UI divider). */
  --mellon-separator-line: var(--mellon-border);
  --mellon-separator-text: var(--mellon-text-muted);
  /* QR icon button (cross-device). */
  --mellon-qr-btn-bg: var(--mellon-qr-btn-bg, transparent);
  --mellon-qr-btn-border: var(--mellon-qr-btn-border, var(--mellon-border));
  --mellon-qr-btn-color: var(--mellon-qr-btn-color, var(--mellon-text));
}
:host([theme="dark"]) {
  --mellon-surface: var(--mellon-surface, hsl(var(--surface-elevated, 220 12% 11%)));
  --mellon-text: var(--mellon-text, hsl(var(--text-strong, 220 10% 96%)));
  --mellon-text-muted: var(--mellon-text-muted, hsl(var(--text-muted, 220 8% 62%)));
  --mellon-border: var(--mellon-border, hsl(var(--border-strong, 220 10% 22%)));
  --mellon-primary: var(--mellon-primary, hsl(var(--primary, 217 96% 72%)));
  --mellon-primary-contrast: var(--mellon-primary-contrast, #fff);
  --mellon-focus-ring: var(--mellon-focus-ring, hsl(217 96% 65%));
}
/* Pill variant: landing-style button (circle + label) uses same tokens. */
:host([button-variant="pill"]) .mellon-btn-pill {
  --mellon-btn-bg: var(--mellon-surface);
  --mellon-btn-border: var(--mellon-border);
  --mellon-btn-text: var(--mellon-text);
}
.mellon-root {
  padding: 1rem;
  min-width: 0;
  background: var(--mellon-surface);
  color: var(--mellon-text);
  border-radius: var(--mellon-radius);
}
.mellon-loading,
.mellon-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--mellon-text-muted);
}
.mellon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 500;
  background: var(--mellon-primary);
  color: var(--mellon-primary-contrast);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.mellon-btn:hover:not(:disabled) {
  opacity: 0.92;
}
.mellon-btn:focus-visible {
  outline: 2px solid var(--mellon-focus-ring);
  outline-offset: 2px;
}
.mellon-btn .mellon-btn-icon {
  width: 1.25em;
  height: 1.25em;
  flex-shrink: 0;
}
.mellon-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.mellon-btn-pill {
  min-height: 48px;
  min-width: 48px;
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  border: none;
  background: var(--mellon-surface);
  color: var(--mellon-text);
  gap: 0.75rem;
}
.mellon-btn-pill .mellon-btn-pill-icon-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.275em;
  height: 1.275em;
  border-radius: 50%;
  border: 2px solid currentColor;
  flex-shrink: 0;
}
.mellon-btn-pill .mellon-btn-pill-icon-circle .mellon-btn-icon {
  width: 0.85em;
  height: 0.85em;
}
@media (prefers-reduced-motion: reduce) {
  .mellon-btn, .mellon-modal-wrapper { transition: none; }
}
`.trim();

/** Evaluated at load. Browser-only SDK; would be false in SSR. */
const SUPPORTS_ADOPTED_STYLESHEETS =
  typeof ShadowRoot !== 'undefined' &&
  'adoptedStyleSheets' in ShadowRoot.prototype &&
  typeof CSSStyleSheet !== 'undefined' &&
  'replaceSync' in CSSStyleSheet.prototype;

/** Returns CSSStyleSheet for adoptedStyleSheets when supported; null otherwise (use <style> + textContent). */
export function createConstructableStylesheet(): CSSStyleSheet | null {
  if (!SUPPORTS_ADOPTED_STYLESHEETS) return null;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(BASE_STYLES);
    return sheet;
  } catch {
    return null;
  }
}

/** Returns CSS string for <style> textContent (fallback). */
export function getStylesFallback(): string {
  return BASE_STYLES;
}

/** Extra styles for trymellon-auth-modal: overlay, panel, tabs. */
export const MODAL_EXTRA_STYLES = `
/* Host: full viewport when open, no border (only the inner panel has border). */
:host {
  border: none;
  outline: none;
}
:host([open="true"]) {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
}
:host([open="true"]) .mellon-modal-wrapper {
  pointer-events: auto;
}
/* Wrapper: fills host, no border. Overlay + panel are the only visible layers. */
.mellon-modal-wrapper {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
}
/* Overlay: full viewport, transparent grey only (no border). */
.mellon-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--mellon-overlay, rgba(0,0,0,0.5));
  z-index: 1;
  border: none;
}
/* Panel: vertical gap 2rem (top/bottom) so it doesn't sit flush with viewport edge; sides 1.5rem. Match landing font via --font-sans. */
.mellon-modal-panel {
  position: fixed;
  inset: max(2rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
  margin: auto;
  z-index: 2;
  width: calc(100% - 3rem);
  max-width: 30rem;
  max-height: min(90vh, 34rem);
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  background: var(--mellon-surface);
  color: var(--mellon-text);
  font-family: var(--font-sans, var(--mellon-font-sans, inherit));
  border-radius: 12px;
  border: 1px solid var(--mellon-border);
  padding: var(--mellon-modal-panel-padding);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04);
  -webkit-overflow-scrolling: touch;
}
/* Close button: circular "X" in the top-right corner, aligned with panel padding. */
.mellon-modal-close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  left: auto;
  bottom: auto;
  width: 2.25rem;   /* 36px */
  height: 2.25rem;  /* 36px */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  background: color-mix(in srgb, var(--mellon-surface) 80%, #000 20%);
  color: var(--mellon-text-muted);
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
}
.mellon-modal-close-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--mellon-surface) 70%, #000 30%);
  color: var(--mellon-text);
}
.mellon-modal-close-btn:focus-visible {
  outline: 2px solid var(--mellon-focus-ring);
  outline-offset: 2px;
}
:host([theme="dark"]) .mellon-modal-panel {
  box-shadow: 0 8px 24px -4px rgba(0,0,0,0.35), 0 4px 8px -4px rgba(0,0,0,0.2);
}
/* Dialog title and description: centered, with vertical breathing room. */
.mellon-dialog-title,
.mellon-dialog-desc {
  margin: 0 0 0.75rem;
  padding: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--mellon-text);
  text-align: center;
}
.mellon-dialog-title {
  font-weight: 600;
  font-size: 1.125rem;
  margin-top: 1.25rem;
}
.mellon-dialog-desc {
  color: var(--mellon-text-muted);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
/* Modal spacing scale: base 0.5rem (8px); sections 0.75–1rem; tight 0.25rem. */
.mellon-modal-tabs {
  display: flex;
  gap: 0;
  padding: 0 0 0.75rem;
  border-bottom: none;
}
.mellon-modal-tabs button {
  flex: 1;
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 400;
  background: transparent;
  color: var(--mellon-text-muted);
  border: none;
  border-bottom: 1px solid var(--mellon-border);
  cursor: pointer;
}
.mellon-modal-tabs button[aria-selected="true"] {
  border-bottom-color: var(--mellon-primary);
  font-weight: 600;
  color: var(--mellon-text);
}
.mellon-modal-tabs button:hover {
  color: var(--mellon-text);
}
.mellon-modal-tabs button:focus-visible {
  outline: 2px solid var(--mellon-focus-ring);
  outline-offset: 2px;
}
/* Content wrapper: QR wrap → separator "or" → passkey; all centered with consistent vertical gap. */
.mellon-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem; /* 8px */
}
/* QR / cross-device area: centered; no min-height when empty to avoid extra space. */
.mellon-cross-device-wrap {
  min-height: 11.25rem; /* 180px */
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-top: 0.85rem;   /* ~10% más margen con el top (tabs) */
  margin-bottom: 0.5rem; /* 8px */
}
/* Skeleton and error (modal-owned): visibility by data-qr-area-state. */
.mellon-cross-device-skeleton,
.mellon-cross-device-error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--mellon-cta-text-color);
  text-align: center;
  width: 11.25rem;   /* 180px */
  height: 11.25rem;  /* 180px */
  padding: 0 0.75rem; /* 0 12px */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  border: 1px dashed var(--mellon-separator-line);
  box-sizing: border-box;
  background: var(--mellon-surface-elevated, rgba(128, 128, 128, 0.12));
}
.mellon-cross-device-wrap[data-qr-area-state="default"] .mellon-cross-device-error,
.mellon-cross-device-wrap[data-qr-area-state="loaded"] .mellon-cross-device-skeleton,
.mellon-cross-device-wrap[data-qr-area-state="loaded"] .mellon-cross-device-error {
  display: none;
}
.mellon-cross-device-wrap[data-qr-area-state="waiting"] .mellon-cross-device-slot-wrap,
.mellon-cross-device-wrap[data-qr-area-state="waiting"] .mellon-cross-device-error {
  display: none;
}
.mellon-cross-device-wrap[data-qr-area-state="waiting"] .mellon-cross-device-skeleton {
  display: flex;
}
.mellon-cross-device-wrap[data-qr-area-state="timeout"] .mellon-cross-device-slot-wrap,
.mellon-cross-device-wrap[data-qr-area-state="timeout"] .mellon-cross-device-skeleton {
  display: none;
}
.mellon-cross-device-wrap[data-qr-area-state="timeout"] .mellon-cross-device-error {
  display: flex;
}
.mellon-cross-device-slot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 11.25rem;   /* 180px */
  height: 11.25rem;  /* 180px */
}
/* Default slot content: "Try from another device" (variable colour) + QR icon button; centered in column. */
.mellon-cross-device-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: fit-content;
  max-width: 100%;
  margin-top: 0.5rem;
  margin-left: auto;
  margin-right: auto;
}
.mellon-cross-device-cta-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--mellon-cta-text-color);
}
.mellon-cross-device-cta .mellon-btn-qr-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 0.5rem;
  background: var(--mellon-qr-btn-bg);
  color: var(--mellon-qr-btn-color);
  border: 1px solid var(--mellon-qr-btn-border);
  border-radius: var(--mellon-radius);
  cursor: pointer;
}
.mellon-cross-device-cta .mellon-btn-qr-icon:hover:not(:disabled) {
  background: var(--mellon-separator-line);
}
.mellon-cross-device-cta .mellon-btn-qr-icon:focus-visible {
  outline: 2px solid var(--mellon-focus-ring);
  outline-offset: 2px;
}
.mellon-qr-icon {
  width: 1.75rem;
  height: 1.75rem;
}
/* Separator: standard UI divider — line | "or" | line (all colours via variables). ~15% más margen con el bloque de arriba. */
.mellon-modal-separator {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-top: 0.875rem; /* 0.75rem + ~15% */
  margin-bottom: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--mellon-separator-text);
}
.mellon-modal-separator::before,
.mellon-modal-separator::after {
  content: '';
  flex: 1;
  min-width: 0;
  height: 0;
  border-bottom: 1px solid var(--mellon-separator-line);
}
.mellon-modal-separator .mellon-separator-text {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  flex-shrink: 0;
  position: relative;
  padding: 0.375rem 1.25rem;
  background: transparent;
  z-index: 0;
}
.mellon-modal-separator .mellon-separator-text::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 220%;
  transform: translate(-50%, -50%) rotate(45deg);
  border-radius: 0.35rem;
  border: 2px solid var(--mellon-separator-line);
  background: color-mix(in srgb, var(--mellon-surface) 80%, var(--mellon-text) 20%);
  z-index: -1;
}
/* Passkey slot/root centered in content wrapper. Less space between separator and this block. */
.mellon-modal-separator + .mellon-root {
  margin-top: -0.25rem;
}
.mellon-modal-content .mellon-root {
  display: flex;
  justify-content: center;
  width: 100%;
}
/* QR skeleton loading dots: "Loading QRs" + animated trailing dots while waiting. */
.mellon-qr-dots {
  display: inline-block;
  width: 1.5em;
  text-align: left;
  overflow: hidden;
}
.mellon-qr-dots::after {
  content: '...';
  display: inline-block;
  animation: mellon-qr-dots 1s steps(4, end) infinite;
}
@keyframes mellon-qr-dots {
  0% {
    clip-path: inset(0 100% 0 0);
  }
  33% {
    clip-path: inset(0 66% 0 0);
  }
  66% {
    clip-path: inset(0 33% 0 0);
  }
  100% {
    clip-path: inset(0 0 0 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .mellon-qr-dots::after {
    animation: none;
  }
}
/* Minimal variant: opaque backdrop + panel (no reliance on host CSS vars when modal is in body). */
[data-mellon-modal-variant="minimal"] .mellon-modal-overlay {
  background: rgba(0, 0, 0, 0.65);
}
[data-mellon-modal-variant="minimal"] .mellon-modal-panel {
  border-radius: 1rem;
  border-width: 2px;
  border-style: solid;
}
:host([theme="dark"]) [data-mellon-modal-variant="minimal"] {
  --mellon-border: rgba(255, 255, 255, 0.9);
}
:host([theme="light"]) [data-mellon-modal-variant="minimal"] {
  --mellon-border: rgba(0, 0, 0, 0.15);
}
:host([theme="dark"]) [data-mellon-modal-variant="minimal"] .mellon-modal-panel {
  background: #0f0f0f;
}
:host([theme="light"]) [data-mellon-modal-variant="minimal"] .mellon-modal-panel {
  background: #ffffff;
}
[data-mellon-modal-variant="minimal"] .mellon-modal-tabs {
  padding: 0.5rem 1rem 0;
  border-bottom-width: 2px;
}
[data-mellon-modal-variant="minimal"] .mellon-modal-tabs button {
  padding: 0.4rem 0.6rem;
  font-size: 0.8125rem;
}
/* Responsive: narrow viewports — minimum padding so 5% does not get too small. */
@media (max-width: 22.5rem) {
  .mellon-modal-panel {
    --mellon-modal-panel-padding: max(1rem, 5%);
  }
  .mellon-modal-tabs {
    padding: 0.75rem 0;
  }
  .mellon-modal-tabs button {
    padding: 0.625rem 0.75rem;
  }
  .mellon-modal-content {
    gap: 0.75rem;
  }
}
/* Responsive: very short viewport (e.g. landscape) — ensure panel scrolls. */
@media (max-height: 400px) {
  .mellon-modal-panel {
    max-height: calc(100dvh - 4rem);
  }
}
`.trim();

/** Returns BASE_STYLES + MODAL_EXTRA_STYLES for modal WC. */
export function getModalStylesFallback(): string {
  return BASE_STYLES + '\n' + MODAL_EXTRA_STYLES;
}

/** Constructable stylesheet for modal (base + overlay/panel/tabs). */
export function createModalConstructableStylesheet(): CSSStyleSheet | null {
  if (!SUPPORTS_ADOPTED_STYLESHEETS) return null;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(BASE_STYLES + '\n' + MODAL_EXTRA_STYLES);
    return sheet;
  } catch {
    return null;
  }
}
