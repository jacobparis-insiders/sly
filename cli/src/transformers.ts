import path from "path"
import { existsSync } from "fs"
import { Transformer } from "./index.js"
import { logger } from "~/src/logger.js"
import { getConfigFilepath } from "./get-config.js"
import chalk from "chalk"

export async function resolveTransformers(transformers: string[]) {
  const modules = await Promise.all(
    transformers.map(async (transformer) => {
      const configPath = await getConfigFilepath()
      const transformerPath = path.resolve(configPath, "..", transformer)
      if (!existsSync(transformerPath)) {
        logger.error(
          `Transformer ${transformer} does not exist relative to ${configPath}`
        )
        process.exit(1)
      }

      return import(transformerPath).catch((error) => {
        logger.error(`Failed to load transformer ${transformer}.`)
        if (error.code === "ERR_UNKNOWN_FILE_EXTENSION") {
          logger.warn(
            `Sly must be installed to your node_modules to use typescript transformers.`
          )
          logger.warn(chalk.bold(`npm install --save-dev @sly-cli/sly`))
        } else {
          logger.error(error)
        }
        process.exit(1)
      })
    })
  )

  return modules as Array<{ default: Transformer }>
}
