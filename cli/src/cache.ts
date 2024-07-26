import { LRUCache } from "lru-cache"
import {
  CacheEntry,
  Cache,
  cachified as baseCachified,
  CachifiedOptions,
  totalTtl,
} from "@epic-web/cachified"
import packageJson from "../package.json"

const lru = new LRUCache<string, CacheEntry>({ max: 1000 })

const cache: Cache = {
  set(key, value) {
    const ttl = totalTtl(value?.metadata)
    return lru.set(key, value, {
      ttl: ttl === Infinity ? undefined : ttl,
      start: value?.metadata?.createdTime,
    })
  },
  get(key) {
    return lru.get(key)
  },
  delete(key) {
    return lru.delete(key)
  },
}

export async function cachified<Value>(
  options: Omit<CachifiedOptions<Value>, "cache">
) {
  return baseCachified({
    cache,
    staleWhileRevalidate: Infinity,
    ttl: 0,
    // If the user has disabled the cache, force a fresh value
    forceFresh: process.env.CACHE !== "true",
    ...options,
    // When they update the CLI, get fresh values
    key: `${packageJson.version}-${options.key}`,
  })
}
