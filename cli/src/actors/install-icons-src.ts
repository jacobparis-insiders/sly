import { fromPromise } from "xstate"
import { logger } from "~/src/logger.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"
import type { Transformer } from "~/src/index.js"
import { installFile } from "../install.js"

export async function installIcons({
  payload,
  transformers,
  targetDir,
  logger = console.info,
}: {
  payload: Array<{
    name: string
    files: Array<{
      type: string
      name: string
      content: string
    }>
    meta?: Record<string, unknown>
  }>
  transformers: Array<{ default: Transformer }>
  targetDir: string
  logger: (message: string) => void
}) {
  for (const icon of payload) {
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true })
    }

    const existingIcon = icon.files.filter((file) =>
      existsSync(path.resolve(targetDir, file.name)),
    )

    if (existingIcon.length && !process.env.OVERWRITE) {
      logger(
        `Component ${icon.name} already exists. Use --overwrite to overwrite.`,
      )
      process.exit(1)
    }

    const transformedFiles = await Promise.all(
      icon.files.map(async (file) => {
        if (file.type === "jsonata") return file

        return {
          ...file,
          content: await transformers.reduce(
            async (content, transformer) =>
              transformer.default(await content, icon.meta),
            Promise.resolve(file.content),
          ),
        }
      }),
    )

    for (const file of transformedFiles) {
      await installFile(file, { targetDir })
      logger(`Installed ${file.name}`)
    }
  }
}

export const installIconsSrc = fromPromise(
  ({ input }: { input: Parameters<typeof installIcons>[0] }) => {
    return installIcons(input)
  },
)
