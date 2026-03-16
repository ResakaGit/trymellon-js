/* eslint-disable no-console -- This adapter implements Logger by forwarding to console. */
import type { Logger } from '../ports/logger';

type ConsoleFn = (message: string, ...args: unknown[]) => void;

function log(fn: ConsoleFn, message: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length > 0) {
    fn(`[TryMellon] ${message}`, meta);
  } else {
    fn(`[TryMellon] ${message}`);
  }
}

export class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    log(console.debug, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    log(console.info, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    log(console.warn, message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    log(console.error, message, meta);
  }
}
