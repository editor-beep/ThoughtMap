export function createRateLimiter(maxRequests: number, windowMs: number) {
  const map = new Map<string, { count: number; resetAt: number }>();
  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry || now >= entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    if (entry.count >= maxRequests) return true;
    entry.count++;
    return false;
  };
}
