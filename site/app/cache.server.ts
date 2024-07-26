import { LRUCache } from "lru-cache"
import { type CacheEntry, type Cache, totalTtl } from "@epic-web/cachified"
import { remember } from "@epic-web/remember"

const lru = remember(
  "lru-cache",
  () => new LRUCache<string, CacheEntry<unknown>>({ max: 5000 })
)

export const cache = {
  name: "app-memory-cache",
  set: (key, value) => {
    const ttl = totalTtl(value?.metadata)
    lru.set(key, value, {
      ttl: ttl === Infinity ? undefined : ttl,
      start: value?.metadata?.createdTime,
    })
    return value
  },
  get: (key) => lru.get(key),
  delete: (key) => lru.delete(key),
} satisfies Cache
