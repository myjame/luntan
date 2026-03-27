type FixedWindowEntry = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

declare global {
  var __luntanRateLimitStore__: Map<string, FixedWindowEntry> | undefined;
}

function getStore() {
  if (!globalThis.__luntanRateLimitStore__) {
    globalThis.__luntanRateLimitStore__ = new Map<string, FixedWindowEntry>();
  }

  return globalThis.__luntanRateLimitStore__;
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const store = getStore();
  const current = store.get(input.key);

  if (!current || current.resetAt <= now) {
    store.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs
    });

    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterMs: input.windowMs
    };
  }

  if (current.count >= input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now)
    };
  }

  current.count += 1;
  store.set(input.key, current);

  return {
    ok: true,
    remaining: Math.max(0, input.limit - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now)
  };
}
