import { z } from "zod"
import { libraryItemSchema, libraryItemWithContentSchema } from "./schemas"
import { Config } from "./schemas"
import { resolveLibraryUrls } from "./config"
import { invariant } from "@epic-web/invariant"

export async function getComponentLibraryIndex(
  library: string,
  config: Config,
) {
  invariant(config, "Config not found")

  const { registryUrl } = resolveLibraryUrls(config, library)
  if (!registryUrl) {
    throw new Error(`Library ${library} not found`)
  }

  console.log("Fetching registry URL:", registryUrl)
  const resources = await fetch(registryUrl, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  return {
    name: library,
    resources: z.array(libraryItemSchema).parse(resources),
  }
}

export async function fetchComponentTree(
  library: string,
  components: string[],
  config: Config,
) {
  const { itemUrl } = resolveLibraryUrls(config, library)
  if (!itemUrl) {
    throw new Error(`Library ${library} not found`)
  }

  const result = await Promise.all(
    components.map(async (component) => {
      const url = itemUrl.replace("{name}", component)
      return fetch(url).then((res) => res.json())
    }),
  )

  return z.array(libraryItemWithContentSchema).parse(result)
}
