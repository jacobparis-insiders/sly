import path from "path"
import { existsSync } from "fs"
import { Transformer } from "./index.js"
import { logger } from "~/src/logger.js"
import { getConfigFilepath } from "./get-config.js"

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
          logger.info(
            `You will need to enable the typescript loader to use typescript transformers.`
          )
          logger.info(
            `npx --node-options='--experimental-loader @sly-cli/sly/ts-loader' sly add`
          )
          logger.info(
            `If that doesn't work, check your node version with node --version to see if it supports --experimental-loader.`
          )
        } else {
          logger.error(error)
        }
        process.exit(1)
      })
    })
  )

  return modules as Array<{ default: Transformer }>
}
