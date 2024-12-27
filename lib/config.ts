import { Config, ConfigSchema } from "./schemas"

export function resolveLibraryConfig(config: Config, library: string) {
  const libConfig = config.libraries[library]?.config
  let resolvedConfig

  if (typeof libConfig === "string") {
    if (libConfig in config.config) {
      resolvedConfig = config.config[libConfig]
    }
  } else {
    resolvedConfig = libConfig
  }

  if (resolvedConfig) {
    return resolvedConfig
  }

  return null
}

export function resolveLibraryUrls(config: Config, library: string) {
  const libConfig = config.libraries[library]
  return {
    registryUrl: libConfig?.registryUrl,
    itemUrl: libConfig?.itemUrl,
  }
}

/** @deprecated */
export async function getLocalStorageConfig() {
  const storedConfig = localStorage.getItem("sly-config")

  const defaultConfig = ConfigSchema.parse({
    $schema: "https://sly-cli.fly.dev/registry/config.v2.json",
    config: {},
    items: [],
    libraries: {},
  })

  if (!storedConfig) {
    return defaultConfig
  }

  try {
    const parsedJson = JSON.parse(storedConfig)
    const result = ConfigSchema.safeParse(parsedJson)

    if (result.success) {
      return result.data
    } else {
      console.error("Invalid config:", result.error)
      return defaultConfig
    }
  } catch (error) {
    console.error("Failed to parse stored config:", error)
    return defaultConfig
  }
}
