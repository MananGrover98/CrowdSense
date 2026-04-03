const WINDOW_MS = 15 * 60 * 1000;
const MAX_POSTS_PER_WINDOW = 45;
/** @type {Map<string, number[]>} */
const buckets = new Map();

/** @returns {import('express').RequestHandler} */
export function rateLimitReports() {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let hits = buckets.get(ip) ?? [];
    hits = hits.filter((t) => now - t < WINDOW_MS);
    if (hits.length >= MAX_POSTS_PER_WINDOW) {
      res.set('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
      res.status(429).json({ error: 'Too many reports from this connection. Try again in about 15 minutes.' });
      return;
    }
    hits.push(now);
    buckets.set(ip, hits);
    if (buckets.size > 50_000) buckets.clear();
    next();
  };
}
