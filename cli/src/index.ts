#!/usr/bin/env node
import "./env.js"

import { add } from "~/src/commands/add.js"
import { init } from "~/src/commands/init.js"
import { Command } from "commander"
import { restoreCache } from "./cache.js"
import { refresh } from "./commands/refresh.js"

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

async function main() {
  void restoreCache()

  const program = new Command()
    .name("sly")
    .description(
      "add components, icons, and utilities as code, not dependencies"
    )
    .version("1.0.0", "-v, --version", "display the version number")

  program.addCommand(init).addCommand(add).addCommand(refresh)

  program.parse()
}

main()
