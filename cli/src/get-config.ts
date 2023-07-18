import { promises as fs } from "fs"

import path from "path"
import { cosmiconfig } from "cosmiconfig"
import * as z from "zod"
import ora from "ora"

// ? Do we really need cosmiconfig? We only support .json files
// Other options would be nice but we need to be able to write to it
// and other formats are prohibitively hard to write
const explorer = cosmiconfig("sly", {
  searchPlaces: ["/sly.json"],
})

export const librarySchema = z
  .object({
    name: z.string(),
    directory: z.string(),
    postinstall: z.union([z.string().optional(), z.array(z.string())]),
    transformers: z.array(z.string()),
  })
  .strict()

export type LibrarySchema = z.infer<typeof librarySchema>

export const configSchema = z
  .object({
    $schema: z.string().optional(),
    libraries: z.array(librarySchema),
  })
  .strict()

export type Config = z.infer<typeof configSchema>

export async function getConfig(): Promise<Config | null> {
  const configResult = await explorer.search("./sly.json")
  if (!configResult) {
    return null
  }

  try {
    return configSchema.parse(configResult.config)
  } catch (error) {
    throw new Error(`Invalid configuration found in /sly.json.`)
  }
}

export async function setConfig(fn: (config: Config) => Config) {
  const spinner = ora(`Saving sly.json settings…`).start()

  const config = (await getConfig()) ?? {
    $schema: `${
      process.env.REGISTRY_URL ?? "https://sly-cli.fly.dev"
    }/registry/config.json`,
    libraries: [],
  }

  const newConfig = configSchema.parse(fn(config))

  const configPath = path.resolve(process.cwd(), "sly.json")
  await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf8")

  // future getConfig calls will return stale data if we don't clear it
  explorer.clearSearchCache()

  spinner.succeed()
}
