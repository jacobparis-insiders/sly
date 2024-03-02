/**
 * Most of this code comes from the shadcn/ui CLI
 * @link https://github.com/shadcn/ui/blob/main/packages/cli/src/utils/registry/index.ts
 */
import {
  libraryIndexSchema,
  libraryItemWithContentSchema,
  registryIndexSchema,
} from "site/app/schemas.js"
import * as z from "zod"

import { cachified, dumpCache } from "./cache.js"
import { logger } from "./logger.js"

const baseUrl = process.env.REGISTRY_URL || "https://sly-cli.fly.dev"

export async function getRegistryIndex() {
  try {
    const [result] = await fetchRegistry([`index.json`])

    return registryIndexSchema.parse(result)
  } catch (error) {
    throw new Error(`Failed to fetch the registry index`)
  }
}

export async function getLibraryIndex(library: string) {
  try {
    const [result] = await fetchRegistry([`${library}.json`])

    return libraryIndexSchema.parse(result)
  } catch (error) {
    throw new Error(`Failed to fetch ${library} index from registry.`)
  }
}

export async function fetchTree(
  library: string,
  tree: z.infer<typeof libraryIndexSchema>["resources"]
) {
  const result = await fetchRegistry(
    tree.map((item) => `${library}/${item.name}.json`)
  ).catch((error) => {
    logger.error(error)
    throw new Error(`Failed to fetch tree from registry.`)
  })

  return z
    .array(libraryItemWithContentSchema)
    .parseAsync(result)
    .catch((error) => {
      logger.error(error)
      throw new Error(`Failed to parse tree from registry.`)
    })
}

async function fetchRegistry(paths: string[]) {
  try {
    const response = await Promise.all(
      paths.map((path) =>
        cachified({
          // TODO: add package.json version to key
          key: `${baseUrl}/registry/${path}`,
          async getFreshValue() {
            return fetch(`${baseUrl}/registry/${path}`).then((response) =>
              response.json()
            )
          },
        })
      )
    )

    if (process.env.CACHE) {
      void dumpCache()
    }

    return response
  } catch (error) {
    logger.error(error)
    throw new Error(`Failed to fetch registry from ${baseUrl}.`)
  }
}
