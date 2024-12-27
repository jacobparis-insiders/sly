import { z } from "zod"

export const RegistryLibrarySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  dependencies: z.array(z.string()).optional().default([]),
  devDependencies: z.array(z.string()).optional().default([]),
  registryDependencies: z.array(z.string()).optional().default([]),
})

/**
 * The response when fetching the root index
 */
export const RegistryIndexSchema = z.object({
  version: z.string(),
  libraries: z.array(RegistryLibrarySchema),
})

/**
 * The response when fetching a library index
 */
export const RegistryLibraryIndexSchema = z.object({
  version: z.string(),
  resources: z.array(RegistryLibrarySchema),
})

export const ItemSchema = z.object({
  id: z.string(),
  type: z.enum(["component", "icon", "github", "gist"]),
  name: z.string(),
  url: z.string(),
  overwrite: z.boolean().optional(),
})

export const libraryItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
})

export const libraryItemWithContentSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      type: z.enum(["file"]).optional(),
    }),
  ),
})

export const resolvedLibraryConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  defaultConfig: z.any().optional(),
  registryUrl: z.string().optional(),
  itemUrl: z.string().optional(),
  type: z.enum(["component", "icon", "github", "gist"]).optional(),
  directory: z.string().optional(),
  postinstall: z.string().optional(),
  transformers: z.array(z.string()).optional().default([]),
})

export const libraryConfigSchema = z.object({
  name: z.string().optional(),
  items: z
    .record(
      z.string(),
      z.object({
        id: z.string(),
        name: z.string().optional(),
        files: z
          .array(
            z.object({
              type: z.enum(["file"]).optional(),
              name: z.string().optional(),
              path: z.string(),
              version: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  type: z.enum(["component", "icon", "github", "gist"]).optional(),
  registryUrl: z.string().optional(),
  itemUrl: z.string().optional(),
  config: resolvedLibraryConfigSchema.or(z.string()),
})

export const ConfigSchema = z.object({
  $schema: z.string().optional(),
  config: z.record(z.string(), resolvedLibraryConfigSchema.partial()),
  libraries: z.record(z.string(), libraryConfigSchema),
  items: z.array(ItemSchema),
})

export type LibraryConfig = z.infer<typeof resolvedLibraryConfigSchema>
export type Config = z.infer<typeof ConfigSchema>

export const ConfigResponseSchema = z
  .object({
    type: z.literal("config-response"),
    filepath: z.string(),
    value: ConfigSchema.nullable(),
    messageId: z.string(),
  })
  .or(
    z.object({
      type: z.literal("config-response"),
      filepath: z.null(),
      value: z.null(),
      messageId: z.string(),
    }),
  )

export const ItemFilesResponseSchema = z.object({
  type: z.literal("item-files-response"),
  files: z.record(z.string(), z.any()),
  messageId: z.string(),
})
