import { db } from './firebase-admin.js';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Check whether a request identified by `key` is within the allowed rate limit.
 *
 * Each key gets a document in the `rate_limits` collection that tracks
 * `count`, `firstRequestAt`, and `windowEnd`. When the current window
 * expires the counter resets automatically.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  const ref = db.collection('rate_limits').doc(encodeURIComponent(key));
  const now = Date.now();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();

    // If no record exists or the window has expired, start a fresh window.
    if (!data || now >= data.windowEnd) {
      const firstRequestAt = now;
      const windowEnd = now + windowMinutes * 60 * 1000;

      tx.set(ref, {
        key,
        count: 1,
        firstRequestAt,
        windowEnd,
      });

      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Window is still active — check the count.
    if (data.count < maxRequests) {
      tx.update(ref, { count: data.count + 1 });
      return { allowed: true, remaining: maxRequests - (data.count + 1) };
    }

    // Over the limit.
    const retryAfterSeconds = Math.ceil((data.windowEnd - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  });

  return result;
}

/**
 * If the rate-limit check says "not allowed", send a 429 response and
 * return `true` so the caller knows to stop processing.
 * Returns `false` when the request is allowed to proceed.
 */
export function rateLimitResponse(
  res: any,
  result: RateLimitResult,
): boolean {
  if (!result.allowed) {
    res.status(429).json({
      error: `Trop de tentatives. Réessayez dans ${result.retryAfterSeconds} secondes.`,
    });
    return true;
  }
  return false;
}
