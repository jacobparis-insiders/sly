import { z } from "zod"

export const metaSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string().optional(),
  license: z.string(),
})

export type Meta = z.infer<typeof metaSchema>

export const registryIndexSchema = z.object({
  version: z.string(),
  libraries: z.array(metaSchema),
})

export const libraryItemSchema = z.object({
  name: z.string(),
})

export const libraryIndexSchema = z.object({
  version: z.string(),
  meta: metaSchema,
  resources: z.array(libraryItemSchema),
})

export const libraryItemWithContentSchema = libraryItemSchema.extend({
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    })
  ),
  meta: metaSchema,
})
