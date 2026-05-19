const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;

function createRateLimiter(limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS) {
  const map = new Map();
  return function checkRateLimit(ip) {
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}

module.exports = { createRateLimiter, RATE_LIMIT, RATE_WINDOW_MS };
