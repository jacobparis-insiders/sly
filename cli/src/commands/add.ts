import { existsSync, promises as fs } from "fs"
import path from "path"
import { Config, LibraryConfig, getConfig } from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { fetchTree, getLibraryIndex, getRegistryIndex } from "~/src/registry.js"
import chalk from "chalk"
import { Command } from "commander"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"
import { chooseLibrary, configureLibraries, initLibrary } from "./library.js"
import { confirmationPrompt } from "../prompts.js"

function hasLibrary(config: Config, name: string) {
  return config?.libraries.find((lib) => lib.name === name)
}

export const add = new Command()
  .name("add")
  .description("add code to your project")
  .argument("[library]", "the library to add from")
  .argument("[files...]", "the files to add")
  .option("-o, --overwrite", "overwrite existing files.", false)
  .hook("preAction", () => {
    // This runs before every subcommand, so this is our global state
    const options = add.optsWithGlobals()

    // Flags override env vars
    process.env.OVERWRITE = options.overwrite ? "true" : ""
  })
  .action(async (libArg, filesArg) => {
    let library = z.string().optional().parse(libArg)
    const items = z.array(z.string()).default([]).parse(filesArg)

    // TODO: this would be easier with XState
    let config = await getConfig()
    if (!config) {
      // they don't have a config, send them to init
      await configureLibraries()
      config = await getConfig()

      // if they still don't have a config, something went wrong
      if (!config) {
        // XState fixes this
        logger.error(`Something went wrong. Please try again.`)
        process.exit(1)
      }
    }

    // they don't choose library, we ask them to choose
    if (!library) {
      // This is used in two places, candidate for a function
      const CONFIG_LIBS = "\n    Configure libraries ->"
      library = config
        ? await chooseLibrary([
            ...config.libraries,
            {
              name: CONFIG_LIBS,
            },
          ])
        : CONFIG_LIBS

      if (library === CONFIG_LIBS) {
        return configureLibraries()
      }
    } else {
      // they choose library, it's not in their config, we ask them to configure
      if (!hasLibrary(config, library)) {
        const { libraries } = await getRegistryIndex()
        if (!libraries.find((lib) => lib.name === library)) {
          logger.error(`Library ${library} not in registry`)
          process.exit(1)
        }

        await initLibrary(library)
        config = await getConfig()
      }
    }

    if (!config) {
      // XState fixes this
      logger.error(`Something went wrong. Please try again.`)
      process.exit(1)
    }

    const registryIndex = await getLibraryIndex(library)

    let selectedComponents = items
    if (!items?.length) {
      const { items } = await z
        .object({
          items: z.array(z.string()).min(1),
        })
        .parseAsync(
          await prompts({
            type: "multiselect",
            name: "items",
            message: "Which items would you like to add?",
            hint: "Space to select. A to toggle all. Enter to submit.",
            instructions: false,
            choices: registryIndex.resources.map((entry) => ({
              title: entry.name,
              value: entry.name,
            })),
            min: 1,
          })
        )
        .catch(() => process.exit(1))
      selectedComponents = items
    }

    const tree = registryIndex.resources
      .filter((item) => selectedComponents?.includes(item.name))
      .filter(
        (component, index, self) =>
          self.findIndex((c) => c.name === component.name) === index
      )

    const payload = await fetchTree(library, tree)

    if (!payload.length) {
      logger.warn("Selected items not found. Exiting.")
      process.exit(0)
    }

    await confirmationPrompt(
      `Ready to install ${payload.length} items from ${chalk.cyan(
        library
      )}. Proceed?`
    )

    const spinner = ora(`Installing components...\n`).start()

    const libConfig = config.libraries.find(({ name }) => name === library)
    if (!libConfig) {
      // XState fixes this
      logger.error(`Library ${library} not found in config`)
      process.exit(1)
    }

    const transformers = await resolveTransformers(libConfig.transformers)

    for (const item of payload) {
      const itemSpinner = ora(`  Installing ${item.name}...\n`).start()
      const targetDir = libConfig.directory

      if (!existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true })
      }

      const existingComponent = item.files.filter((file) =>
        existsSync(path.resolve(targetDir, file.name))
      )

      if (existingComponent.length && !process.env.OVERWRITE) {
        if (selectedComponents.includes(item.name)) {
          logger.warn(
            `Component ${item.name} already exists. Use ${chalk.green(
              "--overwrite"
            )} to overwrite.`
          )
          process.exit(1)
        }

        continue
      }

      for (const file of item.files) {
        const fileSpinner = ora(`    Installing ${file.name}...\n`).start()

        const output = await transformers.reduce(
          async (content, transformer) =>
            transformer.default(await content, item.meta),
          Promise.resolve(file.content)
        )

        await fs.writeFile(path.resolve(targetDir, file.name), output)

        fileSpinner.succeed(`    Installed ${path.join(targetDir, file.name)}`)
      }
      itemSpinner.succeed(`  Installed ${item.name}`)
    }

    if (libConfig.postinstall && libConfig.postinstall.length > 0) {
      const cmd =
        typeof libConfig.postinstall === "string"
          ? libConfig.postinstall
          : libConfig.postinstall[0]
      const args =
        typeof libConfig.postinstall === "string"
          ? []
          : libConfig.postinstall.slice(1)

      if (cmd) {
        await execa(cmd, args)
      }
    }
    spinner.succeed(`Done.`)
  })
