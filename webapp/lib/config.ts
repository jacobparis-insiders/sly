import { type Config } from "#app/schema"
import { configCookie } from "#app/utils/cookies"

export async function getLocalStorageConfig(): Promise<Config> {
  // Try to get from localStorage first (for backwards compatibility)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem("sly-config")
    if (stored) {
      try {
        const config = JSON.parse(stored)
        // Migrate to cookie
        await setConfig(config)
        // Clear localStorage after migration
        localStorage.removeItem("sly-config")
        return config
      } catch (e) {
        console.error("Failed to parse localStorage config:", e)
      }
    }
  }

  // Return default config if nothing found
  return { libraries: {}, items: [] }
}

export async function setConfig(config: Config) {
  const cookieString = await configCookie.serialize(config)
  document.cookie = cookieString
  return config
}
