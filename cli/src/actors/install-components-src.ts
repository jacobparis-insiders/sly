import { fromPromise } from "xstate"
import { logger } from "~/src/logger.js"
import { execa } from "execa"
import * as z from "zod"
import { confirm } from "../prompts.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"

import type { Transformer } from "~/src/index.js"
import { libraryItemWithContentSchema } from "site/app/schemas.js"
import { installFile } from "../install.js"

type Component = z.infer<typeof libraryItemWithContentSchema>

export const installComponentsSrc = fromPromise(
  async ({
    input,
  }: {
    input: {
      payload: Component[]
      transformers: Array<{ default: Transformer }>
      targetDir: string
      selectedComponents: string[]
      library: string
    }
  }) => {
    for (const component of input.payload) {
      if (!existsSync(input.targetDir)) {
        await fs.mkdir(input.targetDir, { recursive: true })
      }

      const existingComponent = component.files.filter((file) =>
        existsSync(path.resolve(input.targetDir, file.name)),
      )

      if (existingComponent.length && !process.env.OVERWRITE) {
        if (input.selectedComponents?.includes(component.name)) {
          logger.warn(
            `Component ${component.name} already exists. Use --overwrite to overwrite.`,
          )
          process.exit(1)
        }
        continue
      }

      if (component.dependencies.length || component.devDependencies.length) {
        const shouldInstall = await confirm(
          [
            `${component.name} requires the following`,
            component.dependencies.length ? "\nDependencies:" : "",
            ...component.dependencies.map((dep: string) => `- ${dep}`),
            component.devDependencies.length ? "\nDev Dependencies:" : "",
            ...component.devDependencies.map((dep: string) => `\n- ${dep}`),
            "\nProceed?",
          ]
            .filter(Boolean)
            .join("\n"),
        )

        if (shouldInstall) {
          if (component.dependencies?.length) {
            await execa("npm", ["install", ...component.dependencies])
          }

          if (component.devDependencies?.length) {
            await execa("npm", [
              "install",
              "--save-dev",
              ...component.devDependencies,
            ])
          }
        }
      }

      const transformedFiles = await Promise.all(
        component.files.map(async (file) => {
          if (file.type !== "file") return file

          return {
            ...file,
            content: await input.transformers.reduce(
              async (content, transformer) =>
                transformer.default(await content, component.meta),
              Promise.resolve(file.content),
            ),
          }
        }),
      )

      for (const file of transformedFiles) {
        await installFile(file, { targetDir: input.targetDir })
      }
    }
  },
)
