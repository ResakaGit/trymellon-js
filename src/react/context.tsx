import { createContext, useContext, type ReactNode } from 'react';
import type { TryMellon } from '../core/trymellon';

const TryMellonContext = createContext<TryMellon | null>(null);

export function TryMellonProvider(props: { client: TryMellon; children: ReactNode }) {
  return (
    <TryMellonContext.Provider value={props.client}>{props.children}</TryMellonContext.Provider>
  );
}

export function useTryMellon(): TryMellon {
  const client = useContext(TryMellonContext);
  if (client == null) {
    throw new Error('useTryMellon must be used within TryMellonProvider');
  }
  return client;
}
