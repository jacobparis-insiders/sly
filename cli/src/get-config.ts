import { promises as fs } from "fs"

import { cosmiconfig } from "cosmiconfig"
import * as z from "zod"
import ora from "ora"
import { logger } from "./logger.js"

// Use singleton so we can lazy load the env vars, which might be set as flags
let explorer: ReturnType<typeof cosmiconfig> | null
function getExplorer() {
  // ? Do we really need cosmiconfig? We only support .json files
  // Other options would be nice but we need to be able to write to it
  // and other formats are prohibitively hard to write
  if (!explorer) {
    const paths = ["sly.json", "sly/sly.json"]
    // TODO: submit a PR to add your config dir here
    const directories = ["", ".config", "config", "other"]

    explorer = cosmiconfig("sly", {
      searchPlaces: directories.flatMap((dir) =>
        paths.map((path) => `${dir}/${path}`)
      ),
      cache: false,
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

export async function getConfigFilepath() {
  // ? Should this be an environment variable?
  // We could set it on startup if none is provided

  const configResult = await getExplorer().search()
  if (!configResult) {
    logger.error(`Couldn't find sly.json.`)
    process.exit(1)
  }

  return configResult.filepath
}

export async function getConfig(): Promise<Config | null> {
  const configResult = await getExplorer().search()
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
      process.env.REGISTRY_URL || "https://sly-cli.fly.dev"
    }/registry/config.json`,
    libraries: [],
  }

  const newConfig = configSchema.parse(fn(config))

  const configFile = await getExplorer().search()

  await fs.writeFile(
    configFile ? configFile.filepath : "sly.json",
    JSON.stringify(newConfig, null, 2),
    "utf8"
  )

  spinner.succeed()
}
