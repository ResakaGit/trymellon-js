import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleLogger } from '../../../src/core/adapters/console-logger';

describe('ConsoleLogger', () => {
  let debugSpy: ReturnType<typeof vi.fn>;
  let infoSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('debug with message only calls console.debug with prefixed message', () => {
    const logger = new ConsoleLogger();
    logger.debug('test message');
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledWith('[TryMellon] test message');
  });

  it('debug with meta calls console.debug with message and meta', () => {
    const logger = new ConsoleLogger();
    logger.debug('request', { requestId: 'id-1', url: 'https://a.com' });
    expect(debugSpy).toHaveBeenCalledWith('[TryMellon] request', {
      requestId: 'id-1',
      url: 'https://a.com',
    });
  });

  it('info with message only calls console.info with prefixed message', () => {
    const logger = new ConsoleLogger();
    logger.info('info message');
    expect(infoSpy).toHaveBeenCalledWith('[TryMellon] info message');
  });

  it('info with meta calls console.info with message and meta', () => {
    const logger = new ConsoleLogger();
    logger.info('event', { name: 'start' });
    expect(infoSpy).toHaveBeenCalledWith('[TryMellon] event', { name: 'start' });
  });

  it('warn with message only calls console.warn with prefixed message', () => {
    const logger = new ConsoleLogger();
    logger.warn('warn message');
    expect(warnSpy).toHaveBeenCalledWith('[TryMellon] warn message');
  });

  it('warn with meta calls console.warn with message and meta', () => {
    const logger = new ConsoleLogger();
    logger.warn('deprecated', { since: '1.0' });
    expect(warnSpy).toHaveBeenCalledWith('[TryMellon] deprecated', { since: '1.0' });
  });

  it('error with message only calls console.error with prefixed message', () => {
    const logger = new ConsoleLogger();
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalledWith('[TryMellon] error message');
  });

  it('error with meta calls console.error with message and meta', () => {
    const logger = new ConsoleLogger();
    logger.error('failed', { code: 'NETWORK_FAILURE' });
    expect(errorSpy).toHaveBeenCalledWith('[TryMellon] failed', { code: 'NETWORK_FAILURE' });
  });

  it('does not pass meta when meta is empty object', () => {
    const logger = new ConsoleLogger();
    logger.debug('msg', {});
    expect(debugSpy).toHaveBeenCalledWith('[TryMellon] msg');
  });
});
