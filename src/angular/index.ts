import type { Provider } from '@angular/core';
import type { TryMellonConfig } from '../types';
import { TRYMELLON_CONFIG } from './trymellon.service';

export { TryMellonService, TRYMELLON_CONFIG } from './trymellon.service';

export function provideTryMellonConfig(config: TryMellonConfig): Provider {
  return { provide: TRYMELLON_CONFIG, useValue: config } as Provider;
}
