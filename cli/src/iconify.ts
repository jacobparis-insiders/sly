import { invariant } from "@epic-web/invariant"
import { z } from "zod"

const IconifyInfoSchema = z.object({
  name: z.string(),
  total: z.number(),
  author: z.object({
    name: z.string(),
    url: z.string().optional(),
  }),
  license: z.object({
    title: z.string(),
    spdx: z.string(),
    url: z.string().optional(),
  }),
  samples: z.array(z.string()),
  height: z.number().optional(),
  category: z.string().optional(),
  palette: z.boolean(),
})

const IconifyCollectionsSchema = z.record(z.string(), IconifyInfoSchema)

export async function getIconifyIndex() {
  const index = await fetch("https://api.iconify.design/collections").then(
    (res) => res.json(),
  )

  return IconifyCollectionsSchema.parse(index)
}

const IconifyLibrarySchema = z.object({
  prefix: z.string(),
  total: z.number(),
  categories: z.record(z.string(), z.array(z.string())).optional(),
  uncategorized: z.array(z.string()).optional(),
})

export async function getIconifyLibraryIndex(library: string) {
  invariant(library.startsWith("iconify:"), "Invalid library name")
  const collectionName = library.replace("iconify:", "")

  const index = await fetch(
    `https://api.iconify.design/collection?prefix=${collectionName}`,
  ).then((res) => res.json())

  const parsedIndex = IconifyLibrarySchema.parse(index)

  return parsedIndex
}

export async function fetchIcons(library: string, icons: string[]) {
  invariant(library.startsWith("iconify:"), "Invalid library name")
  const collectionName = library.replace("iconify:", "")

  const payload = await Promise.all(
    icons.map(async (icon) => {
      const content = await fetch(
        `https://api.iconify.design/${collectionName}/${icon}.svg`,
      ).then((res) => res.text())

      return {
        name: `${icon}.svg`,
        files: [
          {
            type: "file",
            name: `${icon}.svg`,
            content: [
              `<!-- Downloaded from ${collectionName}/${icon}.svg -->`,
              content,
            ].join("\n"),
          },
        ],
      }
    }),
  )

  return payload
}
