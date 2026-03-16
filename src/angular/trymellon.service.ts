import { Injectable, InjectionToken, inject } from '@angular/core';
import type { TryMellon } from '../core/trymellon';

export const TRYMELLON_CLIENT = new InjectionToken<TryMellon>('TRYMELLON_CLIENT');

@Injectable({ providedIn: 'root' })
export class TryMellonService {
  private readonly _client = inject(TRYMELLON_CLIENT, { optional: true });

  get client(): TryMellon {
    if (this._client == null) {
      throw new Error(
        'TryMellonService: provide TRYMELLON_CLIENT (e.g. via provideTryMellon(client))'
      );
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
