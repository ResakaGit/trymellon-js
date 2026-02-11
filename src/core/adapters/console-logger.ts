/* eslint-disable no-console -- This adapter implements Logger by forwarding to console. */
import type { Logger } from '../ports/logger';

export class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.debug(`[TryMellon] ${message}`, meta);
    } else {
      console.debug(`[TryMellon] ${message}`);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.info(`[TryMellon] ${message}`, meta);
    } else {
      console.info(`[TryMellon] ${message}`);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(`[TryMellon] ${message}`, meta);
    } else {
      console.warn(`[TryMellon] ${message}`);
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (meta && Object.keys(meta).length > 0) {
      console.error(`[TryMellon] ${message}`, meta);
    } else {
      console.error(`[TryMellon] ${message}`);
    }
  }
}
