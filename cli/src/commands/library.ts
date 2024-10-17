import {
  LibraryConfig,
  getConfig,
  libraryConfigSchema,
  resolveLibraryConfig,
  setConfig,
} from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { Command } from "commander"
import chalk from "chalk"
import prompts from "prompts"
import { getRegistryIndex } from "~/src/registry.js"
import { confirmOrQuit } from "../prompts.js"
import { z } from "zod"

export const libraryCommand = new Command()
  .name("library")
  .alias("lib")
  .alias("l")
  .argument("[name]", "the name of the library to add")
  .description(`Configure and add libraries to your project`)
  .action(async (argName) => {
    if (argName) {
      const { libraries } = await getRegistryIndex()
      const library = libraries.find((lib) => lib.name === argName)
      if (!library) {
        logger.error(`Library ${argName} not found`)
        process.exit(1)
      }

      return initLibrary(library.name)
    }

    // No library name provided, show the list
    // XState fixes this
    const config = await getConfig()
    const CONFIG_LIBS = "\n    Configure libraries ->"
    const choice = config
      ? await chooseLibrary([
          ...config.libraries,
          {
            name: CONFIG_LIBS,
          },
        ])
      : CONFIG_LIBS

    if (choice === CONFIG_LIBS) {
      return configureLibraries()
    }

    return initLibrary(choice)
  })

export async function configureLibraries() {
  const existingConfig = await getConfig()

  const { libraries } = await getRegistryIndex()

  const answers = await z
    .object({
      libraries: z.array(z.string()),
    })
    .parseAsync(
      await prompts([
        {
          type: "multiselect",
          name: "libraries",
          message: `Which libraries would you like to use?`,
          choices: libraries.map((library) => ({
            title: library.name,
            description: library.description,
            value: library.name,
            selected: Boolean(existingConfig?.libraries[library.name]),
          })),
          min: 1,
        },
      ]),
    )
    .catch(() => process.exit(1))

  const newLibraries = answers.libraries.filter((name: string) =>
    Boolean(!existingConfig?.libraries[name]),
  )

  for (const name of newLibraries) {
    await initLibrary(name)
  }

  const removedLibraries = Object.keys(existingConfig?.libraries || {}).filter(
    (library) => !answers.libraries.includes(library),
  )

  if (removedLibraries?.length) {
    await confirmOrQuit(
      `Are you sure you want to remove ${removedLibraries
        .map((library) => chalk.cyan(library))
        .join(", ")}?`,
    )

    await setConfig((config) => {
      for (const library of removedLibraries) {
        delete config.libraries[library]
      }

      return config
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 100))
}

export async function chooseLibrary(
  libraries: { name: LibraryConfig["name"] }[],
) {
  const { library } = await z
    .object({
      library: z.string(),
    })
    .parseAsync(
      await prompts({
        type: "select",
        name: "library",
        message: `Which library would you like to use?`,
        choices: libraries.map((library) => ({
          title: library.name,
          value: library.name,
        })),
      }),
    )
    .catch(() => process.exit(1))

  return library
}

export async function initLibrary(name: string) {
  const config = await getConfig()

  const existingConfig = (config && resolveLibraryConfig(config, name)) ?? {
    directory: "./components",
    postinstall: [],
    transformers: [],
  }

  // Check for existing top-level configurations
  const topLevelConfigs = config?.config
    ? Object.entries(config.config).flatMap(([key, value]) => {
        if ("directory" in value) {
          return key
        }

        return []
      })
    : []

  if (topLevelConfigs.length > 0) {
    const { configChoice } = await prompts({
      type: "select",
      name: "configChoice",
      message: `Use an existing config for ${chalk.cyan(
        name,
      )} or set up a new one?`,
      choices: [
        ...topLevelConfigs.map((key) => ({
          title: key,
          value: key,
        })),
        { title: "New settings", value: "new" },
      ],
    })

    // If the user chooses "new", proceed to define new settings
    if (configChoice !== "new") {
      await setConfig((config) => {
        config.libraries[name] = {
          config: configChoice,
        }

        return config
      })
      return
    }
  }

  const answers = await z
    .object({
      directory: z.string(),
      postinstall: z
        .string()
        .transform((value) => (value.trim() ? value.trim().split(" ") : [])),
    })
    .parseAsync(
      await prompts([
        {
          type: "text",
          name: "directory",
          message: `Pick a directory for ${chalk.cyan(name)}`,
          initial: existingConfig.directory,
        },
        {
          type: "text",
          name: "postinstall",
          message: `Run a command after installing ${chalk.cyan(name)}?`,
          initial: Array.isArray(existingConfig.postinstall)
            ? existingConfig.postinstall.join(" ")
            : existingConfig.postinstall,
        },
      ]),
    )
    .catch(() => process.exit(1))

  const newConfig = libraryConfigSchema.parse({
    config: {
      directory: answers.directory,
      postinstall: answers.postinstall,
      transformers: existingConfig.transformers,
    },
  })

  // If a new configuration is defined or an existing one is selected, save the settings
  await confirmOrQuit(`Save settings to ${chalk.cyan("sly.json")}?`)

  await setConfig((config) => {
    if (!config.libraries) {
      config.libraries = {}
    }

    config.libraries[name] = {
      config: newConfig.config,
    }

    return config
  })
}
