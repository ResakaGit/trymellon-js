/**
 * Focus trap: keeps focus inside a container. Tab/Shift+Tab cycle within; deactivate restores focus to previous element or body.
 * Used by adapters; WC in presentation only calls activate/deactivate.
 * Constants: interactions/constants.ts.
 */
import { FOCUSABLE_SELECTOR } from './constants';

/** Excludes hidden elements; avoids offsetParent (often null in jsdom shadow). */
function isFocusableCandidate(el: HTMLElement): boolean {
  if ((el as unknown as { hidden?: boolean }).hidden === true) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return true;
}

/** Returns focusable elements inside container in document order (visible only). */
export function getFocusables(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((el) => isFocusableCandidate(el));
}

export interface FocusTrapHandle {
  activate(): void;
  deactivate(): void;
}

/**
 * Creates a focus trap on container. activate(): store activeElement, focus first focusable, add Tab keydown.
 * deactivate(): remove listener, restore focus to stored element if still in document, else body.
 */
export function createFocusTrap(container: HTMLElement): FocusTrapHandle {
  let previousActiveElement: Element | null = null;
  let keydownBound: ((e: KeyboardEvent) => void) | null = null;
  let isActive = false;

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const focusables = getFocusables(container);
    if (focusables.length === 0) return;
    const current = e.target instanceof Node ? (e.target as HTMLElement) : null;
    const currentIndex = current ? focusables.indexOf(current) : -1;
    const lastIndex = focusables.length - 1;
    let nextIndex: number;
    if (e.shiftKey) {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= lastIndex ? 0 : currentIndex + 1;
    }
    const next = focusables[nextIndex];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  function activate(): void {
    if (isActive) return;
    previousActiveElement = document.activeElement;
    const focusables = getFocusables(container);
    const first = focusables[0];
    if (first) {
      first.focus();
    }
    keydownBound = handleKeydown;
    container.addEventListener('keydown', keydownBound, true);
    isActive = true;
  }

  function deactivate(): void {
    if (!isActive) return;
    if (keydownBound) {
      container.removeEventListener('keydown', keydownBound, true);
      keydownBound = null;
    }
    isActive = false;
    const doc = (container.getRootNode() as Document | ShadowRoot)?.ownerDocument ?? document;
    const toRestore =
      previousActiveElement instanceof HTMLElement && doc.body.contains(previousActiveElement)
        ? previousActiveElement
        : null;
    if (toRestore) {
      toRestore.focus();
    } else {
      const body = doc.body as HTMLElement;
      const prevTabindex = body.getAttribute('tabindex');
      body.setAttribute('tabindex', '-1');
      body.focus();
      if (prevTabindex === null) body.removeAttribute('tabindex');
      else body.setAttribute('tabindex', prevTabindex);
    }
    previousActiveElement = null;
  }

  return { activate, deactivate };
}
