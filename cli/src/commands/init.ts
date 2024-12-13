import { logger } from "~/src/logger.js"
import { Command } from "commander"
import chalk from "chalk"
import { configureLibraries } from "./library.js"

export const init = new Command()
  .name("init")
  .description("initialize your project and choose libraries")
  .argument("[library]", "specific library to initialize (e.g., shadcn)")
  .action(async (library?: string) => {
    if (library === "shadcn") {
    } else {
      await configureLibraries()
    }

    logger.info(`${chalk.green("Success!")} Project initialization completed.`)
  })
