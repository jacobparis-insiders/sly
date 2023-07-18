import { existsSync, promises as fs } from "fs"
import path from "path"
import { getConfig } from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { fetchTree, getLibraryIndex } from "~/src/registry.js"
import chalk from "chalk"
import { Command } from "commander"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"

export const add = new Command()
  .name("add")
  .description("add code to your project")
  .argument("[files...]", "the files to add")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .action(async (items, opts) => {
    try {
      const options = z
        .object({
          items: z.array(z.string()).optional(),
          yes: z.boolean(),
          overwrite: z.boolean(),
        })
        .parse({
          items,
          ...opts,
        })

      const config = await getConfig()
      if (!config) {
        // TODO: Send them through the init flow right here
        logger.warn(
          `Configuration is missing. Please run ${chalk.green(
            `init`
          )} to create a sly.json file.`
        )
        process.exit(1)
      }

      const selection = await prompts({
        type: "select",
        name: "library",
        message: `Which library would you like to use?`,
        choices: config.libraries.map((library) => ({
          title: library.name,
          value: library.name,
          selected: config.libraries.some(
            (configLibrary) => configLibrary.name === library.name
          ),
        })),
        min: 1,
      })

      // ? why doesn't prompts know the type already?
      const library = selection.library as string
      if (typeof library !== "string") throw new Error("No library selected.")

      const registryIndex = await getLibraryIndex(selection.library)

      let selectedComponents = options.items
      if (!options.items?.length) {
        const { items } = await prompts({
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
        selectedComponents = items
      }

      if (!selectedComponents?.length) {
        logger.warn("No items selected. Exiting.")
        process.exit(0)
      }

      const tree = registryIndex.resources
        .filter((item) => selectedComponents?.includes(item.name))
        .filter(
          (component, index, self) =>
            self.findIndex((c) => c.name === component.name) === index
        )

      const payload = await fetchTree(selection.library, tree)

      if (!payload.length) {
        logger.warn("Selected items not found. Exiting.")
        process.exit(0)
      }

      if (!options.yes) {
        const { proceed } = await prompts({
          type: "confirm",
          name: "proceed",
          message: `Ready to import item. Proceed?`,
          initial: true,
        })

        if (!proceed) {
          process.exit(0)
        }
      }

      const spinner = ora(`Installing components...\n`).start()

      const libConfig = config.libraries.find(
        (library) => library.name === selection.library
      )
      if (!libConfig) throw new Error()

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

        if (existingComponent.length && !options.overwrite) {
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

          fileSpinner.succeed(
            `    Installed ${path.join(targetDir, file.name)}`
          )
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
        await execa(cmd, args)
      }
      spinner.succeed(`Done.`)
    } catch (error) {
      logger.error(error)
      process.exit(1)
    }
  })
