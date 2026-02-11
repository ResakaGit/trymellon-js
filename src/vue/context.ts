import { inject, provide, type InjectionKey } from 'vue';
import type { TryMellon } from '../core/trymellon';

export const TryMellonKey: InjectionKey<TryMellon> = Symbol('TryMellon');

export function provideTryMellon(client: TryMellon): void {
  provide(TryMellonKey, client);
}

export function useTryMellon(): TryMellon {
  const client = inject(TryMellonKey);
  if (client == null) {
    throw new Error(
      'useTryMellon must be used within a component that has received tryMellon via provideTryMellon'
    );
  }
  return client;
}
