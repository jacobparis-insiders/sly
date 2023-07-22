import { LRUCache } from "lru-cache"
import type { CacheEntry } from "cachified"
import { lruCacheAdapter } from "cachified"

const lru = new LRUCache<string, CacheEntry>({ max: 1000 })

export const cache = lruCacheAdapter(lru)
