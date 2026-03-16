import type { Provider } from '@angular/core';
import type { TryMellon } from '../core/trymellon';
import { TRYMELLON_CLIENT } from './trymellon.service';

export { TryMellonService, TRYMELLON_CLIENT } from './trymellon.service';

export function provideTryMellon(client: TryMellon): Provider {
  return { provide: TRYMELLON_CLIENT, useValue: client } as Provider;
}
