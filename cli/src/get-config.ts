import { promises as fs } from "fs"

import path from "path"
import { cosmiconfig } from "cosmiconfig"
import * as z from "zod"
import ora from "ora"

// Use singleton so we can lazy load the env vars, which might be set as flags
let explorer: ReturnType<typeof cosmiconfig> | null
function getExplorer() {
  // ? Do we really need cosmiconfig? We only support .json files
  // Other options would be nice but we need to be able to write to it
  // and other formats are prohibitively hard to write
  if (!explorer) {
    explorer = cosmiconfig("sly", {
      searchPlaces: ["/sly.json"],
      cache: Boolean(process.env.CACHE),
    })
  }
  return explorer
}

export const libraryConfigSchema = z
  .object({
    name: z.string(),
    directory: z.string(),
    postinstall: z.union([z.string().optional(), z.array(z.string())]),
    transformers: z.array(z.string()),
  })
  .strict()

export type LibraryConfig = z.infer<typeof libraryConfigSchema>

export const configSchema = z
  .object({
    $schema: z.string().optional(),
    libraries: z.array(libraryConfigSchema),
  })
  .strict()

export type Config = z.infer<typeof configSchema>

export async function getConfig(): Promise<Config | null> {
  const configResult = await getExplorer().search("./sly.json")
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
  if (process.env.CACHE) {
    getExplorer().clearSearchCache()
  }

  spinner.succeed()
}
