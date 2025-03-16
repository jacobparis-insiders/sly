#!/usr/bin/env node

import { add } from "./commands/add.js"
import { init } from "~/src/commands/init.js"
import { Command } from "commander"
import { libraryCommand } from "./commands/library.js"
import { checkVersion } from "./check-version.js"
import packageJson from "../package.json"
import { addIcon } from "./commands/add-icon.js"
import { dirname } from "path"
import { addGitHub } from "./commands/add-github.js"
import { addComponent } from "./commands/add-component.js"

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

await checkVersion()

const program = new Command()
  .name("sly")
  .description("add components, icons, and utilities as code, not dependencies")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("--cwd <path>", "the current working directory.")
  .option("--config <path>", "the path to the sly config file.")
  .version(packageJson.version, "-v, --version", "display the version number")
  .hook("preAction", () => {
    // This runs before every command, so this is our global state
    const options = program.optsWithGlobals()

    // Flags override env vars
    process.env.YES = options.yes ? "true" : ""
    process.env.CWD = options.cwd

    const configPath = options.config?.replace(process.env.CWD, "")

    process.env.SLY_CONFIG_PATH = options.config
      ? configPath.endsWith(".json")
        ? dirname(configPath)
        : configPath
      : process.env.SLY_CONFIG_PATH || ""
  })

program
  .addCommand(init)
  .addCommand(add)
  .addCommand(addIcon)
  .addCommand(addGitHub)
  .addCommand(addComponent)
  .addCommand(libraryCommand)

program.parse()

/**
 * These are imported by the JSDoc in the transformers
 */

export type Meta = {
  name: string
  source: string
  description?: string
  license: string
}

export type Transformer = (
  input: string,
  meta: Meta,
) => Promise<string> | string
