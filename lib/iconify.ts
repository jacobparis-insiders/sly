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

const IconifySearchResultSchema = z.object({
  icons: z.array(z.string()),
  total: z.number(),
  limit: z.number(),
  start: z.number(),
})

export async function getIconifyLibraryIndex(
  library: string,
  options?: { query?: string; limit?: number; skip?: number },
) {
  const collectionName = library

  if (options?.query) {
    const searchLimit = options?.skip ? 999 : (options?.limit ?? 32)
    const skipCount = options?.skip ?? 0

    console.log("Fetching…", {
      collectionName,
      query: options.query,
      limit: searchLimit,
      skip: skipCount,
    })
    const index = await fetch(
      `https://api.iconify.design/search?prefix=${collectionName}&query=${options.query}&limit=${searchLimit}&start=${skipCount}`,
    ).then((res) => res.json())

    console.log("Parsed…", IconifySearchResultSchema.parse(index))
    return IconifySearchResultSchema.parse(index)
  }

  const index = await fetch(
    `https://api.iconify.design/collection?prefix=${collectionName}`,
  ).then((res) => res.json())

  if (index === 404) {
    throw new Error(`Iconify collection ${collectionName} not found.`)
  }

  return IconifyLibrarySchema.parse(index)
}

export async function fetchIcons(library: string, icons: string[]) {
  const collectionName = library

  return Promise.all(
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
}
