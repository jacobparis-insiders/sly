/**
 * Most of this code comes from the shadcn/ui CLI
 * @link https://github.com/shadcn/ui/blob/main/packages/cli/src/utils/registry/index.ts
 */

import * as z from "zod"

import { cachified } from "./cache.js"
import { logger } from "./logger.js"
import { CachifiedOptions } from "@epic-web/cachified"
import {
  libraryItemWithContentSchema,
  RegistryIndexSchema,
  RegistryLibraryIndexSchema,
} from "../../lib/schemas.js"

export async function getRegistryIndex() {
  try {
    const [result] = await fetchRegistry([`index.json`])

    return RegistryIndexSchema.parse(result)
  } catch (error) {
    throw new Error(`Failed to fetch the registry index`)
  }
}

export async function getLibraryIndex(library: string) {
  try {
    const [result] = await fetchRegistry([`${library}.json`])

    return RegistryLibraryIndexSchema.parse(result)
  } catch (error) {
    throw new Error(`Failed to fetch ${library} index from registry.`)
  }
}

/**
 * This is used in the "add" command to get the item contents
 */
// TODO: remove this useless function
export async function fetchTree(tree: Array<string>) {
  console.log("fetchTree", tree)
  const result = await fetchRegistry(tree, {
    // When we're fetching the actual item for download, get fresh data
    forceFresh: true,
  }).catch((error) => {
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

async function fetchRegistry<Value>(
  paths: string[],
  options: Partial<Omit<CachifiedOptions<Value>, "key" | "getFreshValue">> = {},
) {
  try {
    const response = await Promise.all(
      paths.map((path) =>
        cachified<Value>({
          ...options,
          key: `${path}`,
          async getFreshValue() {
            return fetch(path).then((response) => response.json())
          },
        }),
      ),
    )

    return response
  } catch (error) {
    logger.error(error)
    throw new Error(`Failed to fetch registry from ${paths[0]}.`)
  }
}
