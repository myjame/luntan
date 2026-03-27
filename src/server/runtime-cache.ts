type RuntimeCacheEntry = {
  value: unknown;
  expiresAt: number;
};

declare global {
  var __luntanRuntimeCacheStore__: Map<string, RuntimeCacheEntry> | undefined;
}

function getStore() {
  if (!globalThis.__luntanRuntimeCacheStore__) {
    globalThis.__luntanRuntimeCacheStore__ = new Map<string, RuntimeCacheEntry>();
  }

  return globalThis.__luntanRuntimeCacheStore__;
}

function cloneCacheValue<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

export async function readThroughRuntimeCache<T>(input: {
  key: string;
  ttlMs: number;
  loader: () => Promise<T>;
}) {
  const now = Date.now();
  const store = getStore();
  const cached = store.get(input.key);

  if (cached && cached.expiresAt > now) {
    return cloneCacheValue(cached.value as T);
  }

  const loaded = await input.loader();

  store.set(input.key, {
    value: cloneCacheValue(loaded),
    expiresAt: now + Math.max(0, Math.floor(input.ttlMs))
  });

  return cloneCacheValue(loaded);
}

export function invalidateRuntimeCacheByPrefix(prefix: string) {
  const store = getStore();

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

