import { z } from "zod"

export const metaSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string().optional(),
  license: z.string(),
  tags: z
    .array(z.enum(["icons", "ui", "utilities"]))
    .optional()
    .default([]),
})

export type Meta = z.infer<typeof metaSchema>

/**
 * The response when fetching the root index
 */
export const registryIndexSchema = z.object({
  version: z.string(),
  libraries: z.array(metaSchema),
})

export const libraryItemSchema = z.object({
  name: z.string(),
  dependencies: z.array(z.string()).optional().default([]),
  devDependencies: z.array(z.string()).optional().default([]),
  registryDependencies: z.array(z.string()).optional().default([]),
})

/**
 * The response when fetching a library index
 */
export const libraryIndexSchema = z.object({
  version: z.string(),
  meta: metaSchema,
  resources: z.array(libraryItemSchema),
})

/**
 * The response when fetching an individual item
 */
export const libraryItemWithContentSchema = libraryItemSchema.extend({
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    })
  ),
  meta: metaSchema,
})

/**
 * Returned from the GitHub API when fetching a file
 *
 * @link https://api.github.com/repos/radix-ui/icons/contents/packages/radix-icons/icons/accessibility.svg
 * */
export const githubFile = z.object({
  type: z.literal("file"),
  name: z.string(),
  path: z.string(),
  sha: z.string(),
  size: z.number(),
  url: z.string(),
  html_url: z.string(),
  git_url: z.string(),
  download_url: z.string(),
})

export const npmSchema = z.object({
  versions: z.record(
    z.object({
      version: z.string(),
    })
  ),
  "dist-tags": z.object({
    latest: z.string(),
  }),
})
