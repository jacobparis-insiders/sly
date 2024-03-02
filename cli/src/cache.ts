import fs from "fs"
import path from "path"
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
    // If the user has disabled the cache, force a fresh value
    forceFresh: process.env.CACHE !== "true",
    ...options,
    // When they update the CLI, get fresh values
    key: `${packageJson.version}-${options.key}`,
  })
}

const CACHE_DIRECTORY =
  process.env.CACHE_DIRECTORY || "node_modules/.cache/@sly-cli"
const CACHE_FILENAME = path.join(CACHE_DIRECTORY, "sly.json")

export function dumpCache() {
  if (!fs.existsSync(CACHE_DIRECTORY)) {
    fs.mkdirSync(CACHE_DIRECTORY, { recursive: true })
  }

  fs.writeFileSync(CACHE_FILENAME, JSON.stringify(lru.dump()))
}

export function restoreCache() {
  if (fs.existsSync(CACHE_FILENAME)) {
    const existingCache = fs.readFileSync(CACHE_FILENAME)

    lru.load(JSON.parse(existingCache.toString()))
  }
}

export function clearCache() {
  lru.load([])
  dumpCache()
}
