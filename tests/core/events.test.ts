import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../../src/core/events';
import type { EventPayload, TryMellonEvent } from '../../src/types';

describe('EventEmitter', () => {
  describe('on', () => {
    it('should subscribe to event', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const unsubscribe = emitter.on('start', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call handler when event is emitted', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.on('start', handler);

      const payload: EventPayload = {
        type: 'start',
        operation: 'register',
      };

      emitter.emit('start', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple handlers for same event', () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('start', handler1);
      emitter.on('start', handler2);

      const payload: EventPayload = {
        type: 'start',
        operation: 'authenticate',
      };

      emitter.emit('start', payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should support multiple events', () => {
      const emitter = new EventEmitter();
      const startHandler = vi.fn();
      const successHandler = vi.fn();

      emitter.on('start', startHandler);
      emitter.on('success', successHandler);

      emitter.emit('start', { type: 'start', operation: 'register' });
      emitter.emit('success', { type: 'success', operation: 'register' });

      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('off', () => {
    it('should unsubscribe handler', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.on('start', handler);
      emitter.off('start', handler);

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified handler', () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('start', handler1);
      emitter.on('start', handler2);

      emitter.off('start', handler1);

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe of non-existent handler', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.off('start', handler);

      expect(() => {
        emitter.emit('start', { type: 'start', operation: 'register' });
      }).not.toThrow();
    });
  });

  describe('unsubscribe function', () => {
    it('should return unsubscribe function from on', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const unsubscribe = emitter.on('start', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe when returned function is called', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const unsubscribe = emitter.on('start', handler);
      unsubscribe();

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with multiple unsubscribe calls', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const unsubscribe = emitter.on('start', handler);
      unsubscribe();
      unsubscribe();

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should emit event to all handlers', () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter.on('success', handler1);
      emitter.on('success', handler2);
      emitter.on('success', handler3);

      const payload: EventPayload = {
        type: 'success',
        operation: 'register',
      };

      emitter.emit('success', payload);

      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
      expect(handler3).toHaveBeenCalledWith(payload);
    });

    it('should handle events with no handlers', () => {
      const emitter = new EventEmitter();

      expect(() => {
        emitter.emit('error', {
          type: 'error',
          error: new Error('Test'),
        });
      }).not.toThrow();
    });

    it('should emit different event types', () => {
      const emitter = new EventEmitter();
      const handlers: Record<TryMellonEvent, ReturnType<typeof vi.fn>> = {
        start: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        cancelled: vi.fn(),
      };

      for (const [event, handler] of Object.entries(handlers)) {
        emitter.on(event as TryMellonEvent, handler);
      }

      emitter.emit('start', { type: 'start', operation: 'register' });
      emitter.emit('success', { type: 'success', operation: 'register' });
      emitter.emit('error', { type: 'error', error: new Error('Test') });
      emitter.emit('cancelled', { type: 'cancelled', operation: 'register' });

      expect(handlers.start).toHaveBeenCalledTimes(1);
      expect(handlers.success).toHaveBeenCalledTimes(1);
      expect(handlers.error).toHaveBeenCalledTimes(1);
      expect(handlers.cancelled).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all handlers', () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('start', handler1);
      emitter.on('start', handler2);

      emitter.removeAllListeners();

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove handlers for all events', () => {
      const emitter = new EventEmitter();
      const startHandler = vi.fn();
      const successHandler = vi.fn();

      emitter.on('start', startHandler);
      emitter.on('success', successHandler);

      emitter.removeAllListeners();

      emitter.emit('start', { type: 'start', operation: 'register' });
      emitter.emit('success', { type: 'success', operation: 'register' });

      expect(startHandler).not.toHaveBeenCalled();
      expect(successHandler).not.toHaveBeenCalled();
    });

    it('should allow adding handlers after removeAllListeners', () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('start', handler1);
      emitter.removeAllListeners();
      emitter.on('start', handler2);

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory leaks', () => {
    it('should not leak handlers when unsubscribing', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const unsubscribe = emitter.on('start', handler);
      unsubscribe();

      emitter.emit('start', { type: 'start', operation: 'register' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clean up handlers properly', () => {
      const emitter = new EventEmitter();
      const handlers = Array.from({ length: 10 }, () => vi.fn());

      handlers.forEach((handler) => {
        emitter.on('start', handler);
      });

      handlers.forEach((handler) => {
        emitter.off('start', handler);
      });

      emitter.emit('start', { type: 'start', operation: 'register' });

      handlers.forEach((handler) => {
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });
});
