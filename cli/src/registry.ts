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

import { cachified } from "cachified"
import { cache, dumpCache } from "./cache.js"

const baseUrl = process.env.REGISTRY_URL ?? "https://sly-cli.fly.dev"

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
    console.log(error)
    throw new Error(`Failed to fetch ${library} index from registry.`)
  }
}

export async function fetchTree(
  library: string,
  tree: z.infer<typeof libraryIndexSchema>["resources"]
) {
  try {
    const result = await fetchRegistry(
      tree.map((item) => `${library}/${item.name}.json`)
    )

    return z.array(libraryItemWithContentSchema).parse(result)
  } catch (error) {
    throw new Error(`Failed to fetch tree from registry.`)
  }
}

async function fetchRegistry(paths: string[]) {
  try {
    const response = await Promise.all(
      paths.map((path) =>
        cachified({
          key: path,
          cache,
          async getFreshValue() {
            return fetch(`${baseUrl}/registry/${path}`).then((response) =>
              response.json()
            )
          },
        })
      )
    )

    void dumpCache()

    return response
  } catch (error) {
    throw new Error(`Failed to fetch registry from ${baseUrl}.`)
  }
}
