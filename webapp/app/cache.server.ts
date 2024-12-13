import {
  cachified as baseCachified,
  type CacheEntry,
  type Cache,
  totalTtl,
  type CachifiedOptions,
  verboseReporter,
} from "@epic-web/cachified"
import { remember } from "@epic-web/remember"
import { LRUCache } from "lru-cache"

/* lru cache is not part of this package but a simple non-persistent cache */
const lruInstance = remember(
  "lru",
  () => new LRUCache<string, CacheEntry>({ max: 1000 }),
)

export const lru: Cache = {
  set(key, value) {
    const ttl = totalTtl(value?.metadata)
    return lruInstance.set(key, value, {
      ttl: ttl === Infinity ? undefined : ttl,
      start: value?.metadata?.createdTime,
    })
  },
  get(key) {
    return lruInstance.get(key)
  },
  delete(key) {
    return lruInstance.delete(key)
  },
}

export function cachified<T>(options: Omit<CachifiedOptions<T>, "cache">) {
  return baseCachified({ ...options, cache: lru }, verboseReporter())
}
