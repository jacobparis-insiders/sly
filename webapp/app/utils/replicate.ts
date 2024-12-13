import localforage from "localforage"

const memoryCache = new Map<
  string,
  {
    data: unknown
    timestamp: number
  }
>()

// Add a map to track pending promises
const pendingReplications = new Map<string, Promise<void>>()

export function isReplicated({
  key,
  ttl = Infinity,
}: {
  key: string
  ttl?: number
}) {
  // check ttl
  const data = memoryCache.get(key)
  const now = Date.now()
  return data !== undefined && now - data.timestamp < ttl
}

export async function replicate<T>({
  key,
  getFreshData,
  ttl = Infinity,
}: {
  key: string
  getFreshData: () => Promise<T>
  ttl?: number // optional time-to-live in milliseconds
}) {
  // Check memory cache first
  const cached = memoryCache.get(key)
  const now = Date.now()

  if (cached && now - cached.timestamp < ttl) {
    return cached.data as T
  }

  // Try loading from localForage
  const persisted = await localforage.getItem<{
    data: T
    timestamp: number
  }>(key)

  if (persisted && now - persisted.timestamp < ttl) {
    memoryCache.set(key, persisted)
    return persisted.data
  }

  // If there's already a pending promise for this key, don't replicate again
  if (!pendingReplications.has(key)) {
    // Create and store the promise for this request
    const replication = getFreshData().then(async (data) => {
      const entry = { data, timestamp: now }
      memoryCache.set(key, entry)
      await localforage.setItem(key, entry)
      pendingReplications.delete(key)
    })

    pendingReplications.set(key, replication)
  }

  return null
}
