import { getConfig, resolveLibraryConfig, setConfig } from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { Command } from "commander"
import chalk from "chalk"
import oldPrompts from "prompts"
import { getRegistryIndex } from "~/src/registry.js"
import * as prompts from "../prompts.js"
import { z } from "zod"
import { getIconifyIndex } from "../iconify.js"
import { libraryConfigSchema } from "../../../lib/schemas.js"

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

  const { libraries } = await getRegistryIndex()

  const answers = await z
    .object({
      libraries: z.array(z.string()),
    })
    .parseAsync(
      await oldPrompts([
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

export async function configureComponentLibraries() {
  const existingConfig = await getConfig()

  const shadcn = {
    name: "@shadcn/ui",
    displayName: "Shadcn",
  }

  const libraries = [shadcn]

  const answers = await z
    .object({
      libraries: z.array(z.string()),
    })
    .parseAsync(
      await oldPrompts([
        {
          type: "autocompleteMultiselect",
          name: "libraries",
          message: `Which component libraries would you like to use?`,
          choices: Object.entries(libraries).map(([prefix, library]) => ({
            title: library.displayName ?? library.name,
            value: library.name,
            selected: Boolean(existingConfig?.libraries[library.name]),
          })),
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

  const libraries = await getIconifyIndex()

  console.log("Using latest iconify index")
  const answers = await z
    .object({
      libraries: z.array(z.string()),
    })
    .parseAsync(
      await oldPrompts([
        {
          type: "autocompleteMultiselect",
          name: "libraries",
          message: `Which icon libraries would you like to use?`,
          choices: Object.entries(libraries)
            .map(([prefix, library]) => ({
              title: library.name,
              value: prefix,
              selected: Boolean(existingConfig?.libraries[prefix]),
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
    await initLibrary({
      name: name,
      type: "icon",
      displayName: libraries[name]?.name,
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
      await oldPrompts({
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
  type,
  remote,
}: {
  name: string
  displayName?: string
  type?: "component" | "icon" | "github"
  remote?: (opts: {
    abortController: AbortController
  }) => Promise<Record<string, any>>
}) {
  console.log("initializing library", name, type)
  const config = (await getConfig()) || { config: {}, libraries: {} }

  config.libraries ??= {}
  const existingLibrary = config?.libraries[name]
  // If library already exists, preserve its existing config
  const existingConfig = (existingLibrary &&
    resolveLibraryConfig(config, name)) ?? {
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
    const { configChoice } = await oldPrompts({
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
        // Merge with existing library config if it exists
        config.libraries[name] = {
          ...existingLibrary,
          type: type || existingLibrary?.type,
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

  const abortController = new AbortController()

  const answers = await z
    .object({
      directory: z.string().optional().default(""),
      postinstall: z
        .string()
        .optional()
        .default("")
        .transform((value) => (value.trim() ? value.trim().split(" ") : [])),
    })
    .parseAsync(
      await Promise.race([
        remote?.({ abortController }),
        prompts.group({
          directory: () => {
            return prompts.text({
              defaultValue: existingConfig.directory,
              message: `Pick a directory for ${chalk.cyan(name)}`,
              signal: abortController.signal,
            })
          },
          postinstall: () => {
            return prompts.text({
              defaultValue: Array.isArray(existingConfig.postinstall)
                ? existingConfig.postinstall.join(" ")
                : existingConfig.postinstall,
              message: `Run a command after installing ${chalk.cyan(name)}?`,
              signal: abortController.signal,
            })
          },
        }),
      ]),
    )
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })

  console.log("answers", answers)
  const newConfig = libraryConfigSchema.parse({
    config: {
      directory: answers.directory,
      postinstall: answers.postinstall,
      transformers: existingConfig.transformers,
    },
  })

  await prompts.confirmOrQuit(`Save settings to ${chalk.cyan("sly.json")}?`)

  config.libraries[name] = {
    ...existingLibrary,
    type: type || existingLibrary?.type,
    config: newConfig.config,
  }

  if (displayName) {
    config.libraries[name].name = displayName
  }

  await setConfig(config)
  return config.libraries[name]
}
