import path from "path"
import { existsSync } from "fs"
import { Transformer } from "./index.js"
import { logger } from "~/src/logger.js"

export async function resolveTransformers(transformers: string[]) {
  const modules = await Promise.all(
    transformers.map(async (transformer) => {
      const transformerPath = path.resolve(process.cwd(), transformer)
      if (!existsSync(transformerPath)) {
        return Promise.reject(`Transformer ${transformer} does not exist.`)
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
        } else {
          logger.error(error)
        }
        process.exit(1)
      })
    })
  )

  return modules as Array<{ default: Transformer }>
}
