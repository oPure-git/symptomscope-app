import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createRateLimiter, RATE_LIMIT, RATE_WINDOW_MS } = require('../src/lib/rateLimit');

describe('createRateLimiter', () => {
  it('exports sensible defaults', () => {
    expect(RATE_LIMIT).toBe(10);
    expect(RATE_WINDOW_MS).toBe(5 * 60 * 1000);
  });

  describe('with limit=3, window=1min', () => {
    let checkRateLimit;

    beforeEach(() => {
      checkRateLimit = createRateLimiter(3, 60_000);
    });

    it('allows the first request', () => {
      expect(checkRateLimit('1.2.3.4')).toBe(true);
    });

    it('allows requests up to the limit', () => {
      expect(checkRateLimit('1.2.3.4')).toBe(true);
      expect(checkRateLimit('1.2.3.4')).toBe(true);
      expect(checkRateLimit('1.2.3.4')).toBe(true);
    });

    it('blocks once limit is exceeded', () => {
      checkRateLimit('1.2.3.4');
      checkRateLimit('1.2.3.4');
      checkRateLimit('1.2.3.4');
      expect(checkRateLimit('1.2.3.4')).toBe(false);
      expect(checkRateLimit('1.2.3.4')).toBe(false);
    });

    it('tracks different IPs independently', () => {
      checkRateLimit('1.2.3.4');
      checkRateLimit('1.2.3.4');
      checkRateLimit('1.2.3.4');
      expect(checkRateLimit('1.2.3.4')).toBe(false);
      expect(checkRateLimit('9.9.9.9')).toBe(true);
    });

    it('each createRateLimiter call has its own state', () => {
      const limiterA = createRateLimiter(1, 60_000);
      const limiterB = createRateLimiter(1, 60_000);
      limiterA('1.2.3.4');
      expect(limiterA('1.2.3.4')).toBe(false);
      expect(limiterB('1.2.3.4')).toBe(true);
    });
  });

  describe('window expiry', () => {
    it('resets counter after window expires', async () => {
      const check = createRateLimiter(1, 20);
      expect(check('1.2.3.4')).toBe(true);
      expect(check('1.2.3.4')).toBe(false);
      await new Promise(r => setTimeout(r, 30));
      expect(check('1.2.3.4')).toBe(true);
    });
  });
});
