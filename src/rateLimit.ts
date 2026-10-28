import type { RequestHandler } from "express";

// Sliding one-second window per API key.
export function rateLimit(limitPerSecond: number): RequestHandler {
  const hits = new Map<string, number[]>();
  return (_req, res, next) => {
    const key: string = res.locals.auth.apiKey;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < 1000);
    if (recent.length >= limitPerSecond) {
      res.set("Retry-After", "1");
      res.status(429).json({ message: `Rate limit exceeded: ${limitPerSecond} requests per second per API key` });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
