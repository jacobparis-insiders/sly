import {
  cachified as baseCachified,
  verboseReporter,
  type CacheEntry,
  type Cache as CachifiedCache,
  type CachifiedOptions,
  type Cache,
  totalTtl,
} from "@epic-web/cachified"
import { remember } from "@epic-web/remember"
import { type Client, createClient } from "@libsql/client"

import { LRUCache } from "lru-cache"
import { z } from "zod"
import { invariant } from "@epic-web/invariant"

// TODO: ship on pkgless
const cacheDb = remember("cacheDb", createDatabase)

async function createDatabase(): Promise<Client> {
  invariant(
    process.env.TURSO_CACHE_DATABASE_URL,
    "TURSO_CACHE_DATABASE_URL is not set",
  )
  invariant(process.env.TURSO_CACHE_TOKEN, "TURSO_CACHE_TOKEN is not set")

  const client = createClient({
    url: process.env.TURSO_CACHE_DATABASE_URL,
    authToken: process.env.TURSO_CACHE_TOKEN,
    fetch: global.fetch,
  })

  await client.execute(`
			CREATE TABLE IF NOT EXISTS cache (
				key TEXT PRIMARY KEY,
				metadata TEXT,
				value TEXT
			)
		`)

  return client
}

const lruInstance = remember(
  "lru-cache",
  () => new LRUCache<string, CacheEntry<unknown>>({ max: 10000 }),
)

export const lru = {
  name: "app-memory-cache",
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
} satisfies Cache

const cacheEntrySchema = z.object({
  metadata: z.object({
    createdTime: z.number(),
    ttl: z.number().nullable().optional(),
    swr: z.number().nullable().optional(),
  }),
  value: z.unknown(),
})
const cacheQueryResultSchema = z.object({
  metadata: z.string(),
  value: z.string(),
})

export const cache: CachifiedCache = {
  name: "SQLite cache",
  async get(key) {
    const db = await cacheDb
    const result = await db.execute({
      sql: "SELECT value, metadata FROM cache WHERE key = ?",
      args: [key],
    })

    const parseResult = cacheQueryResultSchema.safeParse(result.rows[0])
    if (!parseResult.success) return null

    const parsedEntry = cacheEntrySchema.safeParse({
      metadata: JSON.parse(parseResult.data.metadata),
      value: JSON.parse(parseResult.data.value),
    })
    if (!parsedEntry.success) return null
    const { metadata, value } = parsedEntry.data
    if (!value) return null
    return { metadata, value }
  },
  async set(key, entry) {
    const db = await cacheDb
    await db.execute({
      sql: "INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (@key, @value, @metadata)",
      args: {
        key,
        value: JSON.stringify(entry.value),
        metadata: JSON.stringify(entry.metadata),
      },
    })
  },
  async delete(key) {
    const db = await cacheDb
    await db.execute({
      sql: "DELETE FROM cache WHERE key = ?",
      args: [key],
    })
  },
}

export async function cachified<Value>(
  options: CachifiedOptions<Value>,
): Promise<Value> {
  return baseCachified(options, verboseReporter<Value>())
}

export async function doubleCachified<Value>(
  options: Omit<CachifiedOptions<Value>, "cache">,
) {
  // first layer is LRU memory cache
  return cachified({
    cache: lru,
    key: options.key,
    async getFreshValue() {
      // second layer is Turso cache
      return cachified({
        cache,
        ...options,
      })
    },
  })
}
