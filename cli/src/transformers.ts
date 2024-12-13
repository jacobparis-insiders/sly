import path from "path"
import { existsSync } from "fs"
import { Transformer } from "./index.js"
import { logger } from "~/src/logger.js"
import { getConfigFilepath } from "./get-config.js"
import chalk from "chalk"
import { pathToFileURL } from "url"
import { tsImport } from "tsx/esm/api"

export async function resolveTransformers(transformers: string[]) {
  const modules = await Promise.all(
    transformers.map(async (transformer) => {
      console.log("transformer", transformer)
      const configPath = await getConfigFilepath()
      const transformerPath = path.resolve(configPath, "..", transformer)
      if (!existsSync(transformerPath)) {
        logger.error(
          `Transformer ${transformer} does not exist relative to ${configPath}`,
        )
        process.exit(1)
      }

      // shout out to next
      // https://github.com/vercel/next.js/blob/b15a976e11bf1dc867c241a4c1734757427d609c/packages/next/server/config.ts#L748-L765
      return tsImport(transformerPath, import.meta.url).catch((error) => {
        logger.error(`Failed to load transformer ${transformer}.`)
        process.exit(1)
      })
    }),
  )

  console.log("modules", modules)
  return modules as Array<{ default: Transformer }>
}
