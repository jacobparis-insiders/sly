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
import { getIconifyIndex } from "../iconify.js"

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

      return initLibrary({ name: library.name })
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

    return initLibrary({ name: choice })
  })

export async function configureLibraries() {
  const existingConfig = await getConfig()

  console.log("configuring libraries")
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
    await initLibrary({ name: name })
  }

  await new Promise((resolve) => setTimeout(resolve, 100))
}

export async function configureIconLibraries() {
  const existingConfig = await getConfig()

  console.log("configuring icon libraries")
  const libraries = await getIconifyIndex()

  const answers = await z
    .object({
      libraries: z.array(z.string()),
    })
    .parseAsync(
      await prompts([
        {
          type: "autocompleteMultiselect",
          name: "libraries",
          message: `Which icon libraries would you like to use?`,
          choices: Object.entries(libraries)
            .map(([prefix, library]) => ({
              title: library.name,
              value: `iconify:${prefix}`,
              selected: Boolean(existingConfig?.libraries[library.name]),
            }))
            .toSorted((a, b) => a.title.localeCompare(b.title)),
          min: 1,
        },
      ]),
    )
    .catch(() => process.exit(1))

  const newLibraries = answers.libraries.filter((name: string) =>
    Boolean(!existingConfig?.libraries[name]),
  )

  for (const name of newLibraries) {
    console.log(libraries[name.replace("iconify:", "")])
    await initLibrary({
      name: name,
      displayName: libraries[name.replace("iconify:", "")]?.name,
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 100))
}

export async function chooseLibrary(
  libraries: { name: string; displayName?: string }[],
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
        choices: libraries
          .map((library) => ({
            title: library.displayName ?? library.name,
            value: library.name.toLowerCase(),
          }))
          .toSorted((a, b) => {
            if (a.title.startsWith("\n")) {
              return 1
            }

            return a.title.localeCompare(b.title)
          }),
      }),
    )
    .catch(() => process.exit(1))

  return library
}

export async function initLibrary({
  name,
  displayName,
}: {
  name: string
  displayName?: string
}) {
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

        if (displayName) {
          config.libraries[name].name = displayName
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

    if (displayName) {
      config.libraries[name].name = displayName
    }

    return config
  })
}
