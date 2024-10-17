import { promises as fs } from "fs"

import { cosmiconfig } from "cosmiconfig"
import * as z from "zod"
import ora from "ora"
import { logger } from "./logger.js"
import slyJsonToV2Jsonata from "./files/slyJsonToV2.jsonata.js"
import jsonata from "jsonata"

export function isConfigVersionOne(config: Config | null): config is ConfigV1 {
  return Boolean(config && Array.isArray(config.libraries))
}

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
        paths.map((path) => `${dir}/${path}`),
      ),
      cache: false,
    })
  }
  return explorer
}

const libraryConfigSchemaV1 = z
  .object({
    name: z.string(),
    directory: z.string(),
    postinstall: z.union([z.string().optional(), z.array(z.string())]),
    transformers: z.array(z.string()),
  })
  .strict()

export const resolvedLibraryConfigSchema = z
  .object({
    directory: z.string(),
    postinstall: z.union([z.string().optional(), z.array(z.string())]),
    transformers: z.array(z.string()),
  })
  .strict()

export const libraryConfigSchema = z
  .object({
    config: resolvedLibraryConfigSchema.or(z.string()),
  })
  .strict()

export type LibraryConfig = z.infer<typeof resolvedLibraryConfigSchema>

const configSchemaV1 = z
  .object({
    $schema: z.string().optional(),
    libraries: z.array(libraryConfigSchemaV1),
  })
  .strict()

export const configSchema = z
  .object({
    $schema: z.string().optional(),
    config: z.record(z.string(), resolvedLibraryConfigSchema.partial()),
    libraries: z.record(z.string(), libraryConfigSchema),
  })
  .strict()

export type ConfigV1 = z.infer<typeof configSchemaV1>
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
    const isV1 = configSchemaV1.safeParse(configResult.config)
    if (isV1.success) {
      const codemod = jsonata(slyJsonToV2Jsonata.content)
      const newConfig = await codemod.evaluate(configResult.config)
      return configSchema.parse(newConfig)
    }

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
    }/registry/config.v2.json`,
    config: {
      icons: {},
      components: {},
      utils: {},
    },
    libraries: {},
  }

  const newConfig = configSchema.parse(fn(config))
  const configFile = await getExplorer().search()

  await fs.writeFile(
    configFile ? configFile.filepath : "sly.json",
    JSON.stringify(newConfig, null, 2),
    "utf8",
  )

  spinner.succeed()
  await new Promise((resolve) => setTimeout(resolve, 1))
}

export async function overwriteConfig(config: Config) {
  const configFile = await getExplorer().search()
  const spinner = ora(`Saving sly.json settings…`).start()

  await fs.writeFile(
    configFile ? configFile.filepath : "sly.json",
    JSON.stringify(config, null, 2),
    "utf8",
  )
  spinner.succeed()
  return new Promise((resolve) => setTimeout(resolve, 1))
}

export function resolveLibraryConfig(config: Config, library: string) {
  const libConfig = config.libraries[library]?.config
  let resolvedConfig

  if (typeof libConfig === "string") {
    if (libConfig in config.config) {
      resolvedConfig = config.config[libConfig]
    }
  } else {
    resolvedConfig = libConfig
  }

  if (resolvedConfig) {
    return resolvedConfig
  }

  return null
}
