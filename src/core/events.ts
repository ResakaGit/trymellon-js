import type { EventHandler, EventPayload, TryMellonEvent } from '../types';

export class EventEmitter {
  private handlers: Map<TryMellonEvent, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  on(event: TryMellonEvent, handler: EventHandler): () => void {
    let handlersSet = this.handlers.get(event);
    if (!handlersSet) {
      handlersSet = new Set();
      this.handlers.set(event, handlersSet);
    }

    handlersSet.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  off(event: TryMellonEvent, handler: EventHandler): void {
    const handlersSet = this.handlers.get(event);
    if (!handlersSet) {
      return;
    }
    handlersSet.delete(handler);
    if (handlersSet.size === 0) {
      this.handlers.delete(event);
    }
  }

  emit(event: TryMellonEvent, payload: EventPayload): void {
    const handlersSet = this.handlers.get(event);
    if (handlersSet) {
      for (const handler of handlersSet) {
        try {
          handler(payload);
        } catch {
          // Silently ignore handler errors to prevent one handler from breaking others
          // Handler errors are the responsibility of the handler implementation
        }
      }
    }
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }
}
