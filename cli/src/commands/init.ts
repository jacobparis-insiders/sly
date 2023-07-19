import { logger } from "~/src/logger.js"
import { Command } from "commander"
import chalk from "chalk"
import { configureLibraries } from "./library.js"

export const init = new Command()
  .name("init")
  .description("initialize your project and choose libraries")
  .action(async () => {
    await configureLibraries()

    logger.info(`${chalk.green("Success!")} Project initialization completed.`)
  })
