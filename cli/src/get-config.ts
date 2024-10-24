import { promises as fs } from "fs"
import { join } from "path"
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
    const directories = [".", ".config", "config", "other"]

    explorer = cosmiconfig("sly", {
      searchPlaces: directories.flatMap((dir) =>
        paths.map((path) => `${dir}/${path}`),
      ),
      ignoreEmptySearchPlaces: true,
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
  .partial()

export const resolvedLibraryConfigSchema = z
  .object({
    directory: z.string(),
    postinstall: z.union([z.string().optional(), z.array(z.string())]),
    transformers: z.array(z.string()),
  })
  .strict()

export const libraryConfigSchema = z
  .object({
    name: z.string().optional(),
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

async function getConfigExplorer() {
  return process.env.SLY_CONFIG_PATH
    ? await getExplorer()
        .load(
          join(
            process.env.CWD || "",
            `${process.env.SLY_CONFIG_PATH}/sly.json`,
          ),
        )
        .catch(() => null)
    : await getExplorer()
        .search()
        .catch(() => null)
}

export async function getConfigFilepath() {
  const configResult = await getConfigExplorer()

  return configResult ? configResult.filepath : null
}

export async function getConfig(): Promise<Config | null> {
  const configResult = await getConfigExplorer()

  if (!configResult) {
    if (process.env.SLY_CONFIG_PATH) {
      logger.error(`No config found at ${process.env.SLY_CONFIG_PATH}`)
      process.exit(1)
    }

    return null
  }

  try {
    const isV1 = configSchemaV1.safeParse(configResult.config)
    if (isV1.success) {
      const codemod = jsonata(slyJsonToV2Jsonata.content)
      const newConfig = await codemod.evaluate(configResult.config)
      return configSchema.parse(newConfig)
    } else {
      logger.info("Using new config format.")
    }

    return configSchema.parse(configResult.config)
  } catch (error) {
    console.error(error)
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
  const configFile = await getConfigFilepath()

  await fs.writeFile(
    configFile ? configFile : "sly.json",
    JSON.stringify(newConfig, null, 2),
    "utf8",
  )

  spinner.succeed()
  await new Promise((resolve) => setTimeout(resolve, 1))
}

export async function overwriteConfig(config: Config) {
  const configFile = await getConfigFilepath()
  const spinner = ora(`Saving sly.json settings…`).start()

  await fs.writeFile(
    configFile ? configFile : "sly.json",
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
