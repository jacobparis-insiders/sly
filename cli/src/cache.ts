import fs from "fs"
import path from "path"
import { LRUCache } from "lru-cache"
import { lruCacheAdapter, CacheEntry } from "cachified"

const lru = new LRUCache<string, CacheEntry>({ max: 1000 })

export const cache = lruCacheAdapter(lru)

const CACHE_DIRECTORY = process.env.CACHE_DIRECTORY ?? "node_modules/.cache/@sly-cli"
const CACHE_FILENAME = path.join(CACHE_DIRECTORY, "sly.json")

export function dumpCache() {
  if (!fs.existsSync(CACHE_DIRECTORY)) {
    fs.mkdirSync(CACHE_DIRECTORY, { recursive: true })
  }

  fs.writeFileSync(
    CACHE_FILENAME,
    JSON.stringify(lru.dump())
  )
}

export function restoreCache() {
  if (fs.existsSync(CACHE_FILENAME)) {
    const existingCache = fs.readFileSync(
      CACHE_FILENAME
    )

    lru.load(JSON.parse(existingCache.toString()))
  }
}

export function clearCache() {
  lru.load([])
  dumpCache()
}
