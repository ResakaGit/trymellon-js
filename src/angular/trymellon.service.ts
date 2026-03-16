import { Injectable, InjectionToken, inject } from '@angular/core';
import { TryMellon } from '../core/trymellon';
import type { TryMellonConfig } from '../types';

export const TRYMELLON_CONFIG = new InjectionToken<TryMellonConfig>('TRYMELLON_CONFIG');

@Injectable({ providedIn: 'root' })
export class TryMellonService {
  private readonly config = inject(TRYMELLON_CONFIG, { optional: true });
  private _client: TryMellon | null = null;

  get client(): TryMellon {
    if (this._client == null) {
      if (this.config == null) {
        throw new Error(
          'TryMellonService: provide TRYMELLON_CONFIG (e.g. via provideTryMellonConfig(config))'
        );
      }
      this._client = new TryMellon(this.config);
    }
    return this._client;
  }

  enroll(options: Parameters<TryMellon['enroll']>[0]): ReturnType<TryMellon['enroll']> {
    return this.client.enroll(options);
  }

  getContextHash(): string {
    return this.client.getContextHash();
  }
}
