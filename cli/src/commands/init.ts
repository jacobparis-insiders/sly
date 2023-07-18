import {
  LibrarySchema,
  getConfig,
  librarySchema,
  setConfig,
} from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { Command } from "commander"
import chalk from "chalk"
import * as z from "zod"
import prompts from "prompts"
import { getRegistryIndex } from "~/src/registry.js"

const initOptionsSchema = z.object({
  yes: z.boolean(),
})

export const init = new Command()
  .name("init")
  .description("initialize your project and choose libraries")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .action(async (opts) => {
    try {
      const options = initOptionsSchema.parse(opts)

      await configureLibraries(options.yes)

      logger.info(
        `${chalk.green("Success!")} Project initialization completed.`
      )
    } catch (error) {
      logger.error(error)
      process.exit(1)
    }
  })

export async function configureLibraries(skip = false) {
  const existingConfig = await getConfig()

  const { libraries } = await getRegistryIndex()

  const options = await prompts([
    {
      type: "multiselect",
      name: "libraries",
      message: `Which libraries would you like to use?`,
      choices: libraries.map((library) => ({
        title: library.name,
        description: library.description,
        value: library.name,
        selected:
          existingConfig?.libraries.some(({ name }) => library.name === name) ??
          false,
      })),
      min: 1,
    },
  ])

  for (const name of options.libraries) {
    logger.info(`Setting up ${chalk.cyan(name)}...`)
    const newSettings = await initLibrary(name)

    if (!skip) {
      await confirmationPrompt(`Save settings to ${chalk.cyan("sly.json")}?`)
    }

    await setConfig((config) => {
      const existingLibraryConfig = config.libraries.find(
        (library) => library.name === name
      )

      if (existingLibraryConfig) {
        existingLibraryConfig.directory = newSettings.directory
        existingLibraryConfig.postinstall = newSettings.postinstall
      } else {
        config.libraries.push(newSettings)
      }

      return config
    })
  }
}

async function initLibrary(name: string) {
  const config = await getConfig()

  const existingConfig: LibrarySchema = config?.libraries.find(
    (library) => library.name === name
  ) ?? {
    name,
    directory: "./components",
    postinstall: [],
    transformers: [],
  }

  const options = await prompts([
    {
      type: "text",
      name: "directory",
      message: `Where should we insert your components?`,
      initial: existingConfig.directory,
    },
    {
      type: "text",
      name: "postinstall",
      message: "Run a command when components have been added?",
      initial: Array.isArray(existingConfig.postinstall)
        ? existingConfig.postinstall.join(" ")
        : existingConfig.postinstall,
    },
  ])

  return librarySchema.parse({
    name,
    directory: options.directory,
    postinstall: options.postinstall.trim()
      ? options.postinstall.trim().split(" ")
      : undefined,
    transformers: existingConfig.transformers,
  })
}

async function confirmationPrompt(message: string) {
  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message,
    initial: true,
  })

  if (!proceed) {
    process.exit(0)
  }
}
