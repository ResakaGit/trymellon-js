/**
 * Auth render helpers: viewmodel → RenderOptions → shadow-render.
 * Single place to translate AuthButtonViewModel / AuthModalViewModel to the existing render() contract.
 */
import type { IRenderSurface } from '../../ports/render.port';
import type { RenderOptions } from '../../ports/render.port';
import type { AuthButtonViewModel, AuthModalViewModel } from '../../domain/auth-viewmodels';
import { tabToUIMode } from '../../domain/types';
import { render } from './shadow.adapter';

function viewModelToRenderOptions(vm: AuthButtonViewModel): RenderOptions {
  return {
    theme: vm.theme,
    mode: vm.mode,
    buttonVariant: vm.buttonVariant,
    registerSessionReady: vm.registerSessionReady,
    primaryButtonLabel: vm.primaryButtonLabel,
    primaryButtonAriaLabel: vm.primaryButtonAriaLabel,
  };
}

function modalViewModelToRenderOptions(vm: AuthModalViewModel): RenderOptions {
  return {
    theme: vm.theme,
    mode: tabToUIMode(vm.tab),
    buttonVariant: 'pill',
    registerSessionReady: vm.registerSessionReady,
    primaryButtonLabel: vm.primaryButtonLabel,
    primaryButtonAriaLabel: vm.primaryButtonAriaLabel,
  };
}

/**
 * Renders the auth button/trigger FSM content onto the surface using the viewmodel.
 * Uses the existing shadow-render adapter; does not know DOM beyond the surface.
 */
export function renderAuthButton(surface: IRenderSurface, vm: AuthButtonViewModel): void {
  render(surface, vm.state, viewModelToRenderOptions(vm));
}

/**
 * Renders the auth modal FSM content onto the surface using the viewmodel.
 * Does not create modal structure (wrapper/overlay/panel); the WC must call ensureModalStructure first if applicable.
 */
export function renderAuthModal(surface: IRenderSurface, vm: AuthModalViewModel): void {
  render(surface, vm.state, modalViewModelToRenderOptions(vm));
}
