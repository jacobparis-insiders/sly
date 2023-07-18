import { logger } from "~/src/logger.js"
import chalk from "chalk"
import { Command } from "commander"
import { clearCache } from "../cache.js"

export const refresh = new Command()
  .name("refresh")
  .description("clear the cache and refresh the library index")
  .action(() => {
    clearCache()

    logger.info(`${chalk.green("Success!")} Cache cleared`)

    process.exit(1)
  })
