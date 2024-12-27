import { promises as fs } from "fs"
import { join } from "path"
import { cosmiconfig } from "cosmiconfig"
import * as z from "zod"
import ora from "ora"
import { logger } from "./logger.js"
import {
  ItemSchema,
  LibraryConfig,
  libraryConfigSchema,
  resolvedLibraryConfigSchema,
} from "../../lib/schemas.js"

// Use singleton so we can lazy load the env vars, which might be set as flags
let explorer: ReturnType<typeof cosmiconfig> | null
function getExplorer() {
  // ? Do we really need cosmiconfig? We only support .json files
  // Other options would be nice but we need to be able to write to it
  // and other formats are prohibitively hard to write
  if (!explorer) {
    const paths = ["pkgless.json", "pkgless/pkgless.json"]
    // TODO: submit a PR to add your config dir here
    const directories = [".", ".config", "config", "other"]

    explorer = cosmiconfig("pkgless", {
      searchPlaces: directories.flatMap((dir) =>
        paths.map((path) => `${dir}/${path}`),
      ),
      ignoreEmptySearchPlaces: true,
      cache: false,
    })
  }
  return explorer
}

export const configSchema = z.object({
  $schema: z.string().optional(),
  config: z.record(z.string(), resolvedLibraryConfigSchema.partial()),
  libraries: z.record(z.string(), libraryConfigSchema).optional().default({}),
  items: z.array(ItemSchema).optional().default([]),
})

export type Config = z.infer<typeof configSchema>

async function getConfigExplorer() {
  return process.env.PKGLESS_CONFIG_PATH
    ? await getExplorer()
        .load(
          join(
            process.env.CWD || "",
            `${process.env.PKGLESS_CONFIG_PATH}/pkgless.json`,
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
    if (process.env.PKGLESS_CONFIG_PATH) {
      logger.error(`No config found at ${process.env.PKGLESS_CONFIG_PATH}`)
      process.exit(1)
    }

    return null
  }

  try {
    return configSchema.parse(configResult.config)
  } catch (error) {
    console.error(error)
    throw new Error(`Invalid configuration found in /pkgless.json.`)
  }
}

export async function setConfig(fn: ((config: Config) => Config) | Config) {
  const spinner = ora(`Saving pkgless.json settings…`).start()

  const config = (await getConfig()) ?? {
    config: {
      icons: {},
      components: {},
      utils: {},
    },
    libraries: {},
  }

  const newConfig = configSchema.parse(
    typeof fn === "function" ? fn(config) : fn,
  )
  const configFile = await getConfigFilepath()

  await fs.writeFile(
    configFile ? configFile : "pkgless.json",
    JSON.stringify(newConfig, null, 2),
    "utf8",
  )

  spinner.succeed()
  await new Promise((resolve) => setTimeout(resolve, 1))
  return newConfig
}

export async function overwriteConfig(config: Config) {
  const configFile = await getConfigFilepath()
  const spinner = ora(`Saving pkgless.json settings…`).start()

  await fs.writeFile(
    configFile ? configFile : "pkgless.json",
    JSON.stringify(config, null, 2),
    "utf8",
  )
  spinner.succeed()
  return new Promise((resolve) => setTimeout(resolve, 1))
}

/** @deprecated */
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

// good function
export async function getConfigForLibrary<T extends keyof LibraryConfig>({
  libraryId,
  requiredFields,
}: {
  libraryId: string
  requiredFields?: Array<T>
}) {
  const config = await getConfig()
  if (config) {
    const libConfig = resolveLibraryConfig(config, libraryId)

    // Check if all required fields are present in the local config
    const hasAllRequiredFields =
      !requiredFields ||
      requiredFields.every((field) => field in (libConfig || {}))

    if (libConfig && hasAllRequiredFields) {
      return resolvedLibraryConfigSchema.parse(libConfig) as LibraryConfig &
        Required<Pick<LibraryConfig, T>>
    }
  }

  // If not all required fields are present, fetch from the registry
  const library = await fetch(
    `${process.env.PKGLESS_REGISTRY_URL}/${libraryId}`,
  ).then((res) => res.json())

  if (!library) {
    throw new Error(`Library ${libraryId} not found`)
  }

  return resolvedLibraryConfigSchema.parse(library) as LibraryConfig &
    Required<Pick<LibraryConfig, T>>
}

/** @deprecated */
export function resolveLibraryUrls(config: Config, library: string) {
  const libConfig = config.libraries[library]
  return {
    registryUrl: libConfig?.registryUrl,
    itemUrl: libConfig?.itemUrl,
  }
}

export async function setLibraryConfig(
  libraryId: string,
  {
    name,
    directory,
    postinstall,
  }: { name?: string; directory?: string; postinstall?: string },
) {
  return setConfig((config) => {
    // if library doesn't exist
    const lib = (config.libraries[libraryId] ??= {})

    if (name) {
      const namedConfig = (config.config[name] ??= {})
      namedConfig.directory = directory
      namedConfig.postinstall = postinstall
      lib.config = name
    } else {
      if (typeof lib.config === "string") {
        lib.config = {}
      } else {
        lib.config ??= {}
      }
      lib.config.directory = directory
      lib.config.postinstall = postinstall
    }
  })
}
